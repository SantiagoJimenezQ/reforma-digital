import {
  generateText,
  wrapLanguageModel,
  type LanguageModel,
  type LanguageModelMiddleware,
} from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { Privacidad } from './profile';

/** Quién hace las búsquedas: Exa directamente o el servidor de Reforma Digital, que guarda la clave de Exa. */
export type ConfigBusqueda = { tipo: 'exa'; clave: string } | ServidorReforma;

/**
 * El servidor de Reforma Digital (`apps/web`): guarda las claves del modelo y del buscador, y
 * limita lo que gasta cada instalación. `instalacion` es un identificador aleatorio de la app.
 */
export type ServidorReforma = { tipo: 'reforma'; url: string; instalacion: string };
/** Cabecera con la que la app se identifica ante el servidor de Reforma Digital. */
export const CABECERA_INSTALACION = 'x-rd-instalacion';

export type ConfigProveedor =
  | {
      tipo: 'nan';
      clave: string;
      /** La clave de Exa, que hace las búsquedas. */
      claveExa: string;
      modelo: string;
    }
  | ServidorReforma
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

export type Proveedor = { modelo: Modelo; busqueda: ConfigBusqueda | null };

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

export function crearProveedor(
  cfg: ConfigProveedor,
  guarda?: LanguageModelMiddleware | LanguageModelMiddleware[],
): Proveedor {
  const capas = [guarda ?? []].flat();
  const envolver = (model: Modelo, extra: LanguageModelMiddleware[] = []) =>
    capas.length || extra.length
      ? wrapLanguageModel({ model, middleware: [...capas, ...extra] })
      : model;
  const compatible = (
    name: string,
    baseURL: string,
    apiKey?: string,
    headers?: Record<string, string>,
  ) =>
    createOpenAICompatible({
      name,
      baseURL,
      includeUsage: true,
      ...(apiKey ? { apiKey } : {}),
      ...(headers ? { headers } : {}),
    });
  // El modelo lo elige el servidor: el nombre que se le pasa no cuenta.
  if (cfg.tipo === 'reforma')
    return {
      modelo: envolver(
        compatible('reforma', `${cfg.url}/api/escritorio/v1`, undefined, {
          [CABECERA_INSTALACION]: cfg.instalacion,
        })('reforma'),
      ),
      busqueda: cfg,
    };
  if (cfg.tipo === 'nan')
    return {
      modelo: envolver(compatible('nan', 'https://api.nan.builders/v1', cfg.clave)(cfg.modelo)),
      busqueda: { tipo: 'exa', clave: cfg.claveExa },
    };
  return {
    modelo: envolver(compatible('propio', cfg.url, cfg.clave)(cfg.modelo)),
    busqueda: cfg.busqueda,
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
