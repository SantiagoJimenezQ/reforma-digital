import { randomBytes } from 'node:crypto';
import { setTimeout as dormir } from 'node:timers/promises';
import { tool } from 'ai';
import { z } from 'zod';
import { officialLevel } from '@reforma-digital/government/domains';
import type { Detector, OrigenTexto } from './detector';
import { FetchError, leerPaginaOficial } from './fetch';
import type { Proveedor } from './models';
import {
  elegirOpcion,
  enfocarElemento,
  infoElemento,
  instantanea,
  leerTextoPagina,
  destinoDeTecla,
  pareceIrreversible,
  puntoElemento,
  type InfoElemento,
  type Navegador,
} from './page';
import {
  campoPerfil,
  claveDeDato,
  DETECTADO,
  esIdentificador,
  normalizarCampo,
  normalizarValor,
  perfilParaModelo,
  Privacidad,
  validarCampo,
  type Perfil,
} from './profile';
import {
  buscarEnWebsOficiales,
  coste,
  DOMINIOS_POR_DEFECTO,
  type Fuente,
  type Fuentes,
} from './research';

const campoEntrada = z.object({
  clave: z.string().regex(/^[a-z0-9_]{2,40}$/),
  etiqueta: z.string().min(2).max(90),
  tipo: z.enum(['texto', 'texto_largo', 'fecha', 'opcion', 'si_no', 'numero', 'email', 'telefono']),
  opciones: z.array(z.string().max(80)).max(30).optional(),
  ayuda: z.string().max(200).optional(),
  obligatorio: z.boolean().optional(),
  /** El modelo no ve la respuesta, solo su marcador. Por defecto en datos que no son de contexto. */
  privado: z
    .boolean()
    .optional()
    .describe(
      'false si necesitas leer la respuesta: solo vale en si_no, opcion, numero y texto_largo',
    ),
});
const formularioEntrada = z.object({
  titulo: z.string().min(3).max(90),
  explicacion: z.string().max(300).optional(),
  campos: z.array(campoEntrada).min(1).max(12),
});
const confirmacionEntrada = z.object({
  tipo: z.enum(['enviar', 'pagar', 'firmar', 'reservar', 'otro']),
  accion: z
    .string()
    .min(5)
    .max(160)
    .describe('Qué vas a hacer, p. ej. «Reservar la cita del 3 de noviembre a las 9:30»'),
  detalles: z
    .array(z.string().max(200))
    .max(10)
    .describe('Datos que se enviarán, con marcadores para los datos personales'),
  sitio: z.string().optional(),
});
const ayudaEntrada = z.object({
  motivo: z.enum(['iniciar_sesion', 'captcha', 'certificado', 'firma', 'pago', 'adjuntar', 'otro']),
  instrucciones: z.string().min(5).max(300).describe('Qué tiene que hacer, en una o dos frases'),
});

export type CampoFormulario = z.infer<typeof campoEntrada>;
export type Formulario = z.infer<typeof formularioEntrada>;
export type Ayuda = z.infer<typeof ayudaEntrada>;
export type Confirmacion = Omit<z.infer<typeof confirmacionEntrada>, 'tipo'> & {
  tipo: z.infer<typeof confirmacionEntrada>['tipo'] | 'abrir_web';
  /** Acciones vinculantes ya hechas en este trámite: la persona las ve antes de aprobar otra. */
  previas?: string[];
};

/** Lo que el agente necesita de la app (o del simulador de las evaluaciones). */
export interface Anfitrion {
  perfil(): Perfil;
  guardarPerfil(valores: Perfil): Promise<void>;
  /** `null` si la persona descarta el formulario. */
  preguntar(f: Formulario, signal: AbortSignal): Promise<Record<string, string> | null>;
  confirmar(c: Confirmacion, signal: AbortSignal): Promise<boolean>;
  pedirAyuda(a: Ayuda, signal: AbortSignal): Promise<{ hecho: boolean; nota?: string }>;
  navegador(): Promise<Navegador>;
  /**
   * Lee una página oficial con un navegador real y aparte (sin sesiones del trámite), para webs
   * que rechazan las peticiones que no vienen de un navegador. Solo en la app.
   */
  leerConNavegador?(
    url: string,
    signal: AbortSignal,
  ): Promise<{ url: string; titulo: string; texto: string }>;
}

export type Uso = {
  entrada: number;
  salida: number;
  cache: number;
  costeUsd: number;
  costeDesconocido: boolean;
  pasos: number;
};
export const usoVacio = (): Uso => ({
  entrada: 0,
  salida: 0,
  cache: 0,
  costeUsd: 0,
  costeDesconocido: false,
  pasos: 0,
});

export type EventoAgente =
  | { tipo: 'texto'; delta: string }
  | {
      tipo: 'actividad';
      id: string;
      herramienta: string;
      resumen: string;
      estado: 'inicio' | 'fin' | 'error';
      detalle?: string;
    }
  | { tipo: 'fuentes'; fuentes: Fuente[] }
  | { tipo: 'uso'; uso: Uso }
  | { tipo: 'privacidad'; filtrados: number }
  /** Datos ocultos al modelo en el mensaje de la persona. */
  | { tipo: 'protegidos'; cantidad: number };

export type Contexto = {
  anfitrion: Anfitrion;
  proveedor: Proveedor;
  fuentes: Fuentes;
  privacidad: Privacidad;
  /** Detector local de datos personales que no están en «Mis datos». */
  detector: Detector;
  /**
   * Lo que el agente ha escrito en cada campo, tal como lo escribió (con sus marcadores), por el
   * valor que quedó en la página (normalizado). Es lo único de un campo que ve.
   */
  escritos: Map<string, string>;
  /** Respuestas privadas de este trámite que no son de «Mis datos» (DNI de un hijo, referencias…). */
  datosTramite: Perfil;
  /** Webs no oficiales que la persona ha permitido abrir en este trámite. */
  sitiosPermitidos: Set<string>;
  /** Hosts adicionales de confianza: solo en desarrollo y evaluaciones (la sede de pruebas). */
  hostDePrueba?: (url: string) => boolean;
  /** Códigos de confirmación aprobados y la web en la que se aprobaron. */
  confirmaciones: Map<string, { accion: string; host: string | null }>;
  /** Host de la última página vista en el navegador. */
  hostActual: string | null;
  /** Acciones vinculantes ejecutadas en el trámite (envíos, reservas, pagos, firmas). */
  vinculantes: { accion: string; fecha: string }[];
  uso: Uso;
  evento: (e: EventoAgente) => void;
};

const oficial = (ctx: Contexto, url: string) =>
  Boolean(officialLevel(url)) || Boolean(ctx.hostDePrueba?.(url));
const host = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

/** Perfil global y datos del trámite juntos, para resolver marcadores. */
const todosLosDatos = (ctx: Contexto) => ({ ...ctx.anfitrion.perfil(), ...ctx.datosTramite });

/** Lo que escriben la persona o una web: sin los datos de «Mis datos» ni los que encuentre el detector. */
export function proteger(ctx: Contexto, texto: string, origen: OrigenTexto) {
  ctx.privacidad.actualizar(todosLosDatos(ctx));
  return ctx.privacidad.proteger(texto, ctx.detector, ctx.datosTramite, origen);
}

const sinParametros = (url: string) =>
  url.replace(/[?#].*$/, (q) => (q.startsWith('?') ? '?…' : ''));

async function verPagina(ctx: Contexto, nav: Navegador, aviso = ''): Promise<string> {
  let p;
  try {
    p = await instantanea(nav);
  } catch {
    // La página estaba navegando: se espera a que cargue y se vuelve a leer una vez.
    await nav.esperar(1000);
    p = await instantanea(nav);
  }
  const descargas = nav.descargas?.() ?? [];
  const avisos = [
    oficial(ctx, p.url)
      ? ''
      : '⚠ Esta página no es de una administración: no escribas datos personales.',
    p.captcha ? '⚠ Hay un CAPTCHA: no lo resuelvas tú; usa pedir_ayuda con motivo «captcha».' : '',
    p.contrasenas
      ? '⚠ Hay un campo de contraseña: el inicio de sesión lo hace la persona (pedir_ayuda, motivo «iniciar_sesion»).'
      : '',
  ].filter(Boolean);
  // De un campo solo se ve lo que ha escrito el agente, como lo escribió. Lo que trae la web (los
  // datos de la persona tras iniciar sesión, lo que ella escribe) queda como dato oculto.
  const campos = p.texto.replace(/⟦(\d+)⟧/g, (_m, i: string) => {
    const v = p.valores[Number(i)] ?? '';
    const propio = ctx.escritos.get(normalizarValor(v));
    if (propio !== undefined) return propio;
    const todos = todosLosDatos(ctx);
    const clave = claveDeDato(todos, 'dato', v);
    if (!esIdentificador(clave)) return v;
    if (!todos[clave]) ctx.datosTramite[clave] = v;
    return `{{${clave}}}`;
  });
  const texto = [
    aviso,
    ...descargas.map((d) => `⬇ Descargado «${d}»: ya está guardado en el trámite.`),
    `Página: ${p.titulo} — ${sinParametros(p.url)}`,
    ...avisos,
    '---',
    campos,
  ]
    .filter(Boolean)
    .join('\n');
  ctx.hostActual = host(p.url);
  return texto;
}

/**
 * Lo que sale del navegador del trámite, antes de llegar al modelo: los datos personales como
 * marcador, también las partes de un dato (el día de la fecha, el número del DNI sin la letra)
 * que se ven en un campo. Lo aplica `supervisar` a todas las herramientas de la página.
 */
export async function protegerPagina(ctx: Contexto, texto: string) {
  const limpio = ctx.privacidad.ocultarEnCampos(await proteger(ctx, texto, 'pagina'));
  return Privacidad.marcadores(limpio).length
    ? limpio.replace(
        '\n---\n',
        '\n(Los {{…}} de esta página son los datos reales de la persona, ocultos para ti: el campo está bien relleno.)\n---\n',
      )
    : limpio;
}

const formatoFuente = (f: Fuente, extracto: string) =>
  `[${f.id}] ${f.titulo} — ${host(f.url)}${f.organismo ? ` (${f.organismo})` : ''}\n${extracto}`;

export function crearHerramientas(ctx: Contexto) {
  const signalDe = (o: { abortSignal?: AbortSignal }) =>
    o.abortSignal ?? new AbortController().signal;
  const navegador = () => ctx.anfitrion.navegador();
  const resolver = (texto: string, url: string) => {
    const marcas = Privacidad.marcadores(texto);
    if (marcas.length && !oficial(ctx, url))
      return {
        error:
          'Solo escribo tus datos en webs oficiales. Si hace falta aquí, usa pedir_ayuda para que lo escriba la persona.',
      };
    const datos = new Privacidad(todosLosDatos(ctx)).resolver(texto);
    if (datos.faltan.length)
      return {
        error: `Faltan datos sin guardar: ${datos.faltan.join(', ')}. Pídelos con preguntar.`,
      };
    return { texto: datos.texto };
  };
  const ref = z
    .number()
    .int()
    .positive()
    .describe('Número del elemento entre corchetes en la página');
  /** Webs que no son de la Administración: solo con permiso de la persona, y sin escribir datos. */
  const permitirWeb = async (url: string, signal: AbortSignal) => {
    const u = new URL(url);
    if (oficial(ctx, u.href) || ctx.sitiosPermitidos.has(u.host)) return true;
    if (u.protocol !== 'https:') return false;
    const ok = await ctx.anfitrion.confirmar(
      {
        tipo: 'abrir_web',
        accion: `Abrir ${u.host}`,
        detalles: ['No es una web de la Administración. No escribiré tus datos en ella.'],
        sitio: u.host,
      },
      signal,
    );
    if (ok) ctx.sitiosPermitidos.add(u.host);
    return ok;
  };
  /** Un paso vinculante necesita un código aprobado para esta misma web. */
  type Permiso = { ok: true; codigo?: string; accion?: string } | { ok: false; error: string };
  const codigoValido = (info: InfoElemento, codigo: string | undefined, url: string): Permiso => {
    if (!pareceIrreversible(info) && !codigo) return { ok: true };
    const aprobada = codigo ? ctx.confirmaciones.get(codigo) : undefined;
    if (!codigo || !aprobada)
      return {
        ok: false,
        error: `«${info.nombre}» parece enviar o confirmar algo. Antes llama a confirmar con un resumen de lo que se enviará y pasa aquí el código.`,
      };
    if (aprobada.host && aprobada.host !== host(url))
      return { ok: false, error: `Ese código se aprobó para ${aprobada.host}, no para esta web.` };
    return { ok: true, codigo, accion: aprobada.accion };
  };
  /** Se gasta el código y se apunta la acción solo cuando de verdad se ha ejecutado. */
  const gastar = (v: Permiso) => {
    if (!v.ok || !v.codigo || !v.accion) return;
    ctx.vinculantes.push({ accion: v.accion, fecha: new Date().toISOString() });
    ctx.confirmaciones.delete(v.codigo);
  };
  // El modelo puede pedir varias acciones a la vez: en la página se hacen de una en una, en orden.
  let cola: Promise<unknown> = Promise.resolve();
  const enOrden =
    <A, R>(fn: (a: A, o: { abortSignal?: AbortSignal }) => Promise<R>) =>
    (a: A, o: { abortSignal?: AbortSignal }): Promise<R> => {
      // Lo que esperaba en la cola no se hace si el turno se ha parado mientras.
      const r = cola.then(() => {
        o.abortSignal?.throwIfAborted();
        return fn(a, o);
      });
      cola = r.catch(() => undefined);
      return r;
    };

  return {
    mis_datos: tool({
      description:
        'Qué datos de la persona hay guardados en «Mis datos». Los identificadores aparecen como marcadores {{clave}}: no conoces su valor, pero puedes escribirlos en webs oficiales con escribir o elegir.',
      inputSchema: z.object({}),
      execute: async () => {
        const extra = Object.keys(ctx.datosTramite);
        return (
          perfilParaModelo(ctx.anfitrion.perfil()) +
          (extra.length
            ? `\nDatos de este trámite: ${extra.map((k) => `{{${k}}}`).join(', ')}`
            : '')
        );
      },
    }),

    buscar: tool({
      description:
        'Busca en webs oficiales de las administraciones españolas (Estado, comunidades y sedes municipales). Devuelve fuentes con id (F1, F2…) y extractos. Para un ayuntamiento o diputación concretos, pasa su dominio en dominios.',
      inputSchema: z.object({
        consulta: z
          .string()
          .min(3)
          .max(300)
          .describe('Qué buscar, en español, sin datos personales'),
        dominios: z
          .array(z.string())
          .max(10)
          .optional()
          .describe('Solo estos dominios oficiales, p. ej. ["getafe.es", "comunidad.madrid"]'),
      }),
      execute: async ({ consulta, dominios }, opts) => {
        const limpia = ctx.privacidad.limpiar(consulta, { usuario: true });
        const validos = (dominios ?? [])
          .map(
            (d) =>
              d
                .trim()
                .toLowerCase()
                .replace(/^https?:\/\//, '')
                .split('/')[0]!,
          )
          .filter((d) => officialLevel(`https://${d}/`));
        const { resultados, costeUsd } = await buscarEnWebsOficiales(
          limpia,
          validos.length ? validos : DOMINIOS_POR_DEFECTO,
          ctx.proveedor,
          signalDe(opts),
        );
        if (costeUsd !== null) ctx.uso.costeUsd += costeUsd;
        const vistas = resultados.flatMap((r) => {
          const f = ctx.fuentes.añadir(r.url, r.titulo, r.extracto, 'busqueda');
          return f ? [formatoFuente(f, r.extracto.slice(0, 1400))] : [];
        });
        ctx.evento({ tipo: 'fuentes', fuentes: ctx.fuentes.lista() });
        return vistas.length
          ? vistas.join('\n\n') +
              '\n\nPara citar un dato necesitas su texto literal: si el extracto no basta, usa leer_pagina.'
          : 'Sin resultados en webs oficiales. Prueba con otras palabras o con el dominio del organismo.';
      },
    }),

    leer_pagina: tool({
      description:
        'Lee el texto de una página o PDF de una web oficial (https). Queda como fuente citable. Usa desde para seguir leyendo.',
      inputSchema: z.object({ url: z.string(), desde: z.number().int().min(0).optional() }),
      execute: async ({ url, desde = 0 }, opts) => {
        const previa = ctx.fuentes.obtener(url);
        const destino = previa?.url ?? url;
        let p: { url: string; titulo: string; texto: string };
        try {
          p = await leerPaginaOficial(destino, { signal: signalDe(opts) });
        } catch (e) {
          // Solo cuando la web responde con un error HTTP (suele ser un filtro contra programas):
          // nunca si el dominio no es oficial o apunta a una red privada.
          if (!ctx.anfitrion.leerConNavegador || !(e instanceof FetchError) || !e.status) throw e;
          p = await ctx.anfitrion.leerConNavegador(destino, signalDe(opts));
          if (!officialLevel(p.url)) return `${host(p.url)} no es una web oficial.`;
        }
        const f = ctx.fuentes.añadir(p.url, p.titulo, p.texto, 'pagina');
        if (!f) return `${host(p.url)} no es una web oficial.`;
        ctx.evento({ tipo: 'fuentes', fuentes: ctx.fuentes.lista() });
        const trozo = p.texto.slice(desde, desde + 12000);
        const resto =
          p.texto.length > desde + 12000
            ? `\n… (sigue: leer_pagina con desde=${desde + 12000})`
            : '';
        return formatoFuente(f, trozo) + resto;
      },
    }),

    preguntar: tool({
      description:
        'Pide datos a la persona con un formulario. Usa las claves de «Mis datos» (nombre, documento_numero, telefono…) cuando correspondan: se guardan para otros trámites. No pidas contraseñas, PIN ni códigos. Las respuestas te llegan como marcador {{clave}}, salvo las de si_no, opcion, numero y texto_largo con privado: false.',
      inputSchema: formularioEntrada,
      execute: async (f, opts) => {
        if (
          f.campos.some((c) =>
            /contrase|password|\bpin\b|clave de acceso|codigo sms|código sms/i.test(c.etiqueta),
          )
        )
          return 'No pidas contraseñas, PIN ni códigos: los escribe la persona en la web oficial (pedir_ayuda).';
        // Esas claves son de datos ya encontrados: una respuesta las cambiaría por otra cosa.
        const ocupada = f.campos.find((c) => DETECTADO.test(c.clave));
        if (ocupada)
          return `La clave ${ocupada.clave} es de un dato ya encontrado ({{${ocupada.clave}}}). Usa otra, p. ej. nombre_hijo.`;
        const campos: CampoFormulario[] = f.campos.map((c) => {
          const perfil = campoPerfil(c.clave);
          const tipo = perfil?.tipo === 'fecha' ? 'fecha' : c.tipo;
          return {
            ...c,
            tipo,
            // El modelo solo lee lo que necesita para razonar: un sí o no, una de sus opciones, una
            // cantidad o una explicación (y estas, sin los datos que encuentre el detector). Un
            // identificador de «Mis datos», un nombre, una fecha o un número de documento le
            // llegan siempre como marcador, aunque pida verlos.
            privado:
              esIdentificador(c.clave) &&
              !(
                !perfil &&
                c.privado === false &&
                ['si_no', 'opcion', 'numero', 'texto_largo'].includes(tipo)
              ),
            opciones: c.opciones ?? perfil?.opciones?.slice(),
          };
        });
        const respuestas = await ctx.anfitrion.preguntar({ ...f, campos }, signalDe(opts));
        if (!respuestas) return 'La persona ha cerrado el formulario sin responder.';
        const paraPerfil: Perfil = {};
        const lineas: string[] = [];
        for (const c of campos) {
          const bruto = respuestas[c.clave]?.trim();
          if (!bruto) {
            lineas.push(`- ${c.clave}: (sin respuesta)`);
            continue;
          }
          const valor = normalizarCampo(c.clave, bruto);
          if (campoPerfil(c.clave)) {
            const error = validarCampo(c.clave, valor);
            if (error) {
              lineas.push(`- ${c.clave}: no válido (${error})`);
              continue;
            }
            paraPerfil[c.clave] = valor;
          }
          // Un número largo (la Seguridad Social, una cuenta) tampoco se lee, aunque se pida.
          const privado = c.privado || (c.tipo === 'numero' && valor.replace(/\D/g, '').length > 3);
          if (privado && !campoPerfil(c.clave)) ctx.datosTramite[c.clave] = valor;
          lineas.push(
            privado
              ? `- ${c.clave}: {{${c.clave}}}${campoPerfil(c.clave) ? ' (guardado en Mis datos)' : ''}`
              : `- ${c.clave}: ${await proteger(ctx, valor, 'persona')}`,
          );
        }
        if (Object.keys(paraPerfil).length) await ctx.anfitrion.guardarPerfil(paraPerfil);
        ctx.privacidad.actualizar(todosLosDatos(ctx));
        return `Respuestas:\n${lineas.join('\n')}`;
      },
    }),

    confirmar: tool({
      description:
        'Pide permiso a la persona antes de algo vinculante o irreversible: enviar una solicitud, reservar o anular una cita, pagar o firmar. Resume exactamente qué se enviará y a quién. Si lo aprueba, recibes un código que debes pasar a pulsar en el botón final. Nunca repitas un envío ya hecho.',
      inputSchema: confirmacionEntrada,
      execute: async (c, opts) => {
        const previas = ctx.vinculantes.map((v) => v.accion);
        const aprobado = await ctx.anfitrion.confirmar(
          { ...c, sitio: ctx.hostActual ?? c.sitio, previas },
          signalDe(opts),
        );
        if (!aprobado) return 'La persona NO lo ha aprobado. No lo hagas. Pregúntale qué prefiere.';
        const codigo = 'C' + randomBytes(3).toString('hex').toUpperCase();
        ctx.confirmaciones.set(codigo, { accion: c.accion, host: ctx.hostActual });
        return (
          `Aprobado. Código de confirmación: ${codigo}. Pásalo en pulsar al botón que lo ejecuta; sirve una sola vez.` +
          (previas.length
            ? ` Ojo: en este trámite ya se hizo «${previas.join('», «')}». No lo repitas.`
            : '')
        );
      },
    }),

    pedir_ayuda: tool({
      description:
        'Cede el navegador a la persona para lo que solo puede hacer ella: iniciar sesión (Cl@ve, certificado, DNIe), resolver un CAPTCHA, firmar con AutoFirma, pagar o adjuntar archivos. Espera a que termine y devuelve la página.',
      inputSchema: ayudaEntrada,
      execute: enOrden(async (a, opts) => {
        const r = await ctx.anfitrion.pedirAyuda(a, signalDe(opts));
        const nav = await navegador();
        const nota = r.nota ? ` Nota: ${await proteger(ctx, r.nota, 'persona')}` : '';
        return verPagina(
          ctx,
          nav,
          r.hecho
            ? `La persona dice que ya está.${nota}`
            : `La persona no ha podido hacerlo.${nota}`,
        );
      }),
    }),

    abrir: tool({
      description:
        'Abre una URL en el navegador del trámite y devuelve la página con sus elementos numerados.',
      inputSchema: z.object({ url: z.string() }),
      execute: enOrden(async ({ url }, opts) => {
        if (!URL.canParse(url)) return 'URL no válida.';
        if (!(await permitirWeb(url, signalDe(opts))))
          return 'La persona no quiere abrir esa web (o no es https). Busca la página oficial.';
        const nav = await navegador();
        await nav.abrir(url);
        return verPagina(ctx, nav);
      }),
    }),

    ver: tool({
      description: 'Vuelve a leer la página actual del navegador.',
      inputSchema: z.object({}),
      execute: enOrden(async () => verPagina(ctx, await navegador())),
    }),

    leer_texto: tool({
      description:
        'Texto completo de la página del navegador (sin elementos), por trozos. Si es una web oficial, queda como fuente citable.',
      inputSchema: z.object({ desde: z.number().int().min(0).optional() }),
      execute: enOrden(async ({ desde = 0 }) => {
        const nav = await navegador();
        const { texto, total, titulo } = await leerTextoPagina(nav, desde, 10000);
        ctx.privacidad.actualizar(todosLosDatos(ctx));
        // Una página oficial sin datos de la persona también sirve como fuente citable.
        let cabecera = '';
        if (officialLevel(nav.url()) && !desde && !ctx.privacidad.contieneDatos(texto)) {
          const f = ctx.fuentes.añadir(nav.url(), titulo, texto, 'pagina');
          if (f) {
            cabecera = `[${f.id}] ${f.titulo} — ${host(f.url)} (fuente citable)\n`;
            ctx.evento({ tipo: 'fuentes', fuentes: ctx.fuentes.lista() });
          }
        }
        return (
          cabecera + texto + (total > desde + 10000 ? `\n… (sigue con desde=${desde + 10000})` : '')
        );
      }),
    }),

    pulsar: tool({
      description:
        'Pulsa un botón, enlace u opción. Los botones que envían, confirman, reservan, pagan o firman necesitan el código de confirmar.',
      inputSchema: z.object({ ref, confirmacion: z.string().optional() }),
      execute: enOrden(async ({ ref: r, confirmacion }, opts) => {
        const nav = await navegador();
        const info = await infoElemento(nav, r);
        if (!info) return 'Ese elemento ya no está en la página. Vuelve a verla con ver.';
        if (info.desactivado)
          return `«${info.nombre}» está desactivado. Revisa si falta algún dato.`;
        const v = codigoValido(info, confirmacion, nav.url());
        if (!v.ok) return v.error;
        if (/^https?:/i.test(info.href) && !(await permitirWeb(info.href, signalDe(opts))))
          return 'Ese enlace lleva a una web que no es oficial y la persona no quiere abrirla.';
        const p = await puntoElemento(nav, r);
        if (!p || p.invisible) return 'No puedo pulsarlo: no está visible.';
        if (p.tapado)
          return `«${info.nombre}» está tapado por otro elemento (¿un aviso de cookies o una ventana?). Ciérralo primero.`;
        await nav.clic(p.x, p.y);
        gastar(v);
        await nav.esperar();
        return verPagina(ctx, nav, `Pulsado «${info.nombre}».`);
      }),
    }),

    escribir: tool({
      description:
        'Escribe en un campo de texto, sustituyendo lo que tenga. Para datos de la persona usa marcadores: {{documento_numero}}, {{nombre}}, {{fecha_nacimiento}} (dd/mm/aaaa), {{fecha_nacimiento:iso}}, {{fecha_nacimiento:dia}}/:mes/:anio, {{documento_numero:numero}} y :letra. Para enviar el formulario, pulsa su botón.',
      inputSchema: z.object({ ref, texto: z.string().max(2000) }),
      execute: enOrden(async ({ ref: r, texto }) => {
        const nav = await navegador();
        if (!oficial(ctx, nav.url()) && !ctx.sitiosPermitidos.has(host(nav.url())))
          return 'Esta web no es oficial y la persona no la ha permitido: no escribo en ella.';
        const info = await infoElemento(nav, r);
        if (!info) return 'Ese elemento ya no está en la página. Vuelve a verla con ver.';
        if (info.contrasena)
          return 'Las contraseñas las escribe la persona: usa pedir_ayuda con motivo «iniciar_sesion».';
        if (info.rol !== 'textbox')
          return `«${info.nombre}» no es un campo de texto (${info.rol || info.tag}). Usa elegir, marcar o pulsar.`;
        const resuelto = resolver(texto, nav.url());
        if ('error' in resuelto) return resuelto.error;
        const p = await puntoElemento(nav, r);
        if (p && !p.invisible && !p.tapado) await nav.clic(p.x, p.y);
        if (!(await enfocarElemento(nav, r))) return 'No puedo escribir en ese campo.';
        await nav.insertarTexto(resuelto.texto);
        ctx.escritos.set(normalizarValor(resuelto.texto), texto);
        const despues = await infoElemento(nav, r);
        // Nunca se repite aquí el valor del campo: podría contener datos de la persona.
        const aviso =
          despues && despues.valor !== resuelto.texto
            ? `Ojo: el campo no ha quedado igual que lo escrito (tiene ${despues.valor.length} caracteres en vez de ${resuelto.texto.length}; puede tener formato o un límite). Revisa la página.`
            : `Escrito en «${info.nombre}»${Privacidad.marcadores(texto).length ? ' (con el valor real de los marcadores)' : ''}.`;
        return verPagina(ctx, nav, aviso);
      }),
    }),

    elegir: tool({
      description:
        'Elige una opción de un desplegable por su texto (admite marcadores de «Mis datos»).',
      inputSchema: z.object({ ref, opcion: z.string().max(200) }),
      execute: enOrden(async ({ ref: r, opcion }) => {
        const nav = await navegador();
        const resuelto = resolver(opcion, nav.url());
        if ('error' in resuelto) return resuelto.error;
        // Con marcadores, el modelo solo ve el marcador, nunca la opción resuelta.
        const conMarcas = Privacidad.marcadores(opcion).length > 0;
        const res = await elegirOpcion(nav, r, resuelto.texto);
        if (!res.ok)
          return conMarcas
            ? `Ese desplegable no tiene ninguna opción para ${opcion}.`
            : (res.error ?? 'No se ha podido elegir.');
        await nav.esperar();
        return verPagina(ctx, nav, `Elegido «${conMarcas ? opcion : res.elegida}».`);
      }),
    }),

    marcar: tool({
      description: 'Marca o desmarca una casilla, o elige una opción de un grupo (radio).',
      inputSchema: z.object({ ref, marcado: z.boolean().default(true) }),
      execute: enOrden(async ({ ref: r, marcado }) => {
        const nav = await navegador();
        const info = await infoElemento(nav, r);
        if (!info) return 'Ese elemento ya no está en la página. Vuelve a verla con ver.';
        if (info.marcado === null) return `«${info.nombre}» no es una casilla ni una opción.`;
        if (info.marcado !== marcado) {
          const p = await puntoElemento(nav, r);
          if (!p || p.invisible || p.tapado)
            return 'No puedo pulsarla: no está visible o la tapa otro elemento.';
          await nav.clic(p.x, p.y);
          await nav.esperar(800);
        }
        return verPagina(ctx, nav);
      }),
    }),

    tecla: tool({
      description:
        'Pulsa una tecla en el elemento con el foco. Si Intro o Espacio envían un formulario vinculante, necesitan el código de confirmar.',
      inputSchema: z.object({
        tecla: z.enum(['Enter', 'Tab', 'Escape', 'ArrowDown', 'ArrowUp', 'Backspace', 'Space']),
        confirmacion: z.string().optional(),
      }),
      execute: enOrden(async ({ tecla, confirmacion }) => {
        const nav = await navegador();
        let v: Permiso = { ok: true };
        if (tecla === 'Enter' || tecla === 'Space') {
          const destino = await destinoDeTecla(nav);
          if (destino) v = codigoValido(destino, confirmacion, nav.url());
          if (!v.ok) return v.error;
        }
        await nav.tecla(tecla);
        gastar(v);
        await nav.esperar();
        return verPagina(ctx, nav);
      }),
    }),

    volver: tool({
      description: 'Vuelve a la página anterior del navegador.',
      inputSchema: z.object({}),
      execute: enOrden(async () => {
        const nav = await navegador();
        await nav.atras();
        return verPagina(ctx, nav);
      }),
    }),

    esperar: tool({
      description: 'Espera unos segundos a que la página termine de cargar o cambie.',
      inputSchema: z.object({ segundos: z.number().min(1).max(15) }),
      execute: enOrden(async ({ segundos }) => {
        const nav = await navegador();
        await dormir(segundos * 1000);
        return verPagina(ctx, nav);
      }),
    }),
  };
}
