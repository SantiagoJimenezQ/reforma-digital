import {
  createGateway,
  generateText,
  wrapLanguageModel,
  type LanguageModel,
  type LanguageModelMiddleware,
} from 'ai';
import { createOpenRouter, type OpenRouterChatSettings } from '@openrouter/ai-sdk-provider';
import type { Privacidad } from './profile';

export type ConfigProveedor = {
  tipo: 'gateway' | 'openrouter';
  clave: string;
  /** Modelo del agente, con el identificador del proveedor («openai/gpt-6-luna»). */
  modelo: string;
  /** Solo proveedores que no guardan las peticiones (en Vercel exige el plan Pro). */
  retencionCero?: boolean;
};

/** Un modelo ya creado (no un identificador de texto). */
export type Modelo = Exclude<LanguageModel, string>;

export type Proveedor =
  | {
      tipo: 'gateway';
      modelo: Modelo;
      /** Modelo pequeño para tareas auxiliares: ejecutar la búsqueda, verificar citas. */
      rapido: Modelo;
      gateway: ReturnType<typeof createGateway>;
    }
  | {
      tipo: 'openrouter';
      modelo: Modelo;
      rapido: Modelo;
      modeloBusquedaOpenRouter: (dominios: string[], max: number) => Modelo;
    };

export const MODELO_BUSQUEDA = 'openai/gpt-6-luna';

/**
 * Última defensa antes de que una petición salga hacia el modelo: si algún valor del perfil ha
 * llegado hasta aquí (un fallo de una capa anterior), se sustituye por su marcador y se cuenta.
 */
export function guardaPrivacidad(
  privacidad: Privacidad,
  alFiltrar?: () => void,
): LanguageModelMiddleware {
  // Se recorre cada texto por separado: en el JSON de la petición, los saltos de línea van
  // escapados y un valor partido en dos líneas no se reconocería.
  const esObjeto = (v: unknown): v is object =>
    Boolean(v) && typeof v === 'object' && !(v instanceof Uint8Array) && !(v instanceof URL);
  // `providerOptions` lleva datos del proveedor (el razonamiento cifrado): tocarlo lo estropearía.
  const propio = ([k]: [string, unknown]) => k === 'providerOptions';
  const contiene = (valor: unknown): boolean =>
    typeof valor === 'string'
      ? privacidad.contieneDatos(valor)
      : Array.isArray(valor)
        ? valor.some(contiene)
        : esObjeto(valor) && Object.entries(valor).some((e) => !propio(e) && contiene(e[1]));
  const limpiar = (valor: unknown): unknown => {
    if (typeof valor === 'string') return privacidad.limpiar(valor, { laxo: true });
    if (Array.isArray(valor)) return valor.map(limpiar);
    if (esObjeto(valor))
      return Object.fromEntries(
        Object.entries(valor).map((e) => [e[0], propio(e) ? e[1] : limpiar(e[1])]),
      );
    return valor;
  };
  return {
    transformParams: async ({ params }) => {
      if (!contiene(params.prompt)) return params;
      alFiltrar?.();
      return { ...params, prompt: params.prompt.map((m) => limpiar(m) as typeof m) };
    },
  };
}

/**
 * Las peticiones solo van a proveedores que no entrenan con ellas y, con `retencionCero`, a los
 * que tampoco las guardan. Si ninguno cumple, el proveedor devuelve un error: no se relaja.
 */
const sinEntrenamiento = (retencionCero = false): LanguageModelMiddleware => ({
  transformParams: async ({ params }) => ({
    ...params,
    providerOptions: {
      ...params.providerOptions,
      gateway: {
        ...params.providerOptions?.gateway,
        disallowPromptTraining: true,
        ...(retencionCero ? { zeroDataRetention: true } : {}),
      },
    },
  }),
});

export function crearProveedor(
  cfg: ConfigProveedor,
  guarda?: LanguageModelMiddleware | LanguageModelMiddleware[],
): Proveedor {
  const capas = [guarda ?? []].flat();
  if (cfg.tipo === 'gateway') {
    const gateway = createGateway({ apiKey: cfg.clave });
    const envolver = (model: Modelo) =>
      wrapLanguageModel({ model, middleware: [...capas, sinEntrenamiento(cfg.retencionCero)] });
    return {
      tipo: 'gateway',
      gateway,
      modelo: envolver(gateway(cfg.modelo)),
      rapido: envolver(gateway(MODELO_BUSQUEDA)),
    };
  }
  const envolver = (model: Modelo) =>
    capas.length ? wrapLanguageModel({ model, middleware: capas }) : model;
  const openrouter = createOpenRouter({ apiKey: cfg.clave });
  const conCoste: OpenRouterChatSettings = {
    usage: { include: true },
    provider: { data_collection: 'deny', ...(cfg.retencionCero ? { zdr: true } : {}) },
  };
  return {
    tipo: 'openrouter',
    modelo: envolver(openrouter(cfg.modelo, conCoste)),
    rapido: envolver(openrouter(MODELO_BUSQUEDA, conCoste)),
    modeloBusquedaOpenRouter: (dominios, max) =>
      envolver(
        openrouter(MODELO_BUSQUEDA, {
          ...conCoste,
          reasoning: { effort: 'none', exclude: true },
          extraBody: {
            tools: [
              {
                type: 'openrouter:web_search',
                parameters: {
                  engine: 'parallel',
                  allowed_domains: dominios,
                  max_results: max,
                  max_total_results: max,
                  max_uses: 1,
                  max_characters: 2500,
                },
              },
            ],
            max_tool_calls: 1,
          },
        }),
      ),
  };
}

/** Una petición mínima para comprobar la clave y el modelo antes de guardarlos. */
export async function probarConexion(cfg: ConfigProveedor) {
  const p = crearProveedor(cfg);
  await generateText({
    model: p.modelo,
    prompt: 'Responde solo: OK',
    maxOutputTokens: 16,
    abortSignal: AbortSignal.timeout(30000),
  });
}
