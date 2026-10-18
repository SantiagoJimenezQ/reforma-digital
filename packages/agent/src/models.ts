import {
  createGateway,
  generateText,
  wrapLanguageModel,
  type LanguageModel,
  type LanguageModelMiddleware,
} from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { Privacidad } from './profile';

/** Quién hace las búsquedas: Exa directamente, o Parallel a través de Vercel AI Gateway. */
export type ConfigBusqueda = { tipo: 'exa'; clave: string } | { tipo: 'gateway'; clave: string };

export type ConfigProveedor =
  | {
      tipo: 'gateway';
      clave: string;
      /** Modelo del agente, con el identificador del proveedor («openai/gpt-6-luna»). */
      modelo: string;
      /** Solo proveedores que no guardan las peticiones (en Vercel exige el plan Pro). */
      retencionCero?: boolean;
    }
  | {
      tipo: 'nan';
      clave: string;
      /** La clave de Exa, que hace las búsquedas. */
      claveExa: string;
      modelo: string;
    }
  | {
      /** Un servidor compatible con la API de OpenAI que elige la persona: otro proveedor o un modelo en su ordenador. */
      tipo: 'compatible';
      /** Base de la API, p. ej. `https://api.openai.com/v1` o `http://localhost:11434/v1`. */
      url: string;
      clave?: string;
      modelo: string;
      /** Sin búsqueda, el asistente solo lee las páginas cuya dirección conoce. */
      busqueda: ConfigBusqueda | null;
    };

/** Un modelo ya creado (no un identificador de texto). */
export type Modelo = Exclude<LanguageModel, string>;

type BusquedaGateway = {
  tipo: 'gateway';
  gateway: ReturnType<typeof createGateway>;
  /** Modelo pequeño que solo ejecuta la búsqueda. */
  rapido: Modelo;
};
export type Busqueda = { tipo: 'exa'; clave: string } | BusquedaGateway;

export type Proveedor = { modelo: Modelo; busqueda: Busqueda | null };

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
  const envolver = (model: Modelo, extra: LanguageModelMiddleware[] = []) =>
    capas.length || extra.length
      ? wrapLanguageModel({ model, middleware: [...capas, ...extra] })
      : model;
  const busquedaGateway = (clave: string, retencionCero?: boolean): BusquedaGateway => {
    const gateway = createGateway({ apiKey: clave });
    const rapido = envolver(gateway(MODELO_BUSQUEDA), [sinEntrenamiento(retencionCero)]);
    return { tipo: 'gateway', gateway, rapido };
  };
  const compatible = (name: string, baseURL: string, apiKey?: string) =>
    createOpenAICompatible({ name, baseURL, includeUsage: true, ...(apiKey ? { apiKey } : {}) });
  if (cfg.tipo === 'gateway') {
    const busqueda = busquedaGateway(cfg.clave, cfg.retencionCero);
    const modelo = busqueda.gateway(cfg.modelo);
    return { modelo: envolver(modelo, [sinEntrenamiento(cfg.retencionCero)]), busqueda };
  }
  if (cfg.tipo === 'nan')
    return {
      modelo: envolver(compatible('nan', 'https://api.nan.builders/v1', cfg.clave)(cfg.modelo)),
      busqueda: { tipo: 'exa', clave: cfg.claveExa },
    };
  const b = cfg.busqueda;
  return {
    modelo: envolver(compatible('propio', cfg.url, cfg.clave)(cfg.modelo)),
    busqueda: !b ? null : b.tipo === 'exa' ? b : busquedaGateway(b.clave),
  };
}

/** Una petición mínima para comprobar la clave y el modelo antes de guardarlos. */
export async function probarConexion(cfg: ConfigProveedor) {
  const p = crearProveedor(cfg);
  await generateText({
    model: p.modelo,
    prompt: 'Responde solo: OK',
    abortSignal: AbortSignal.timeout(30000),
  });
}
