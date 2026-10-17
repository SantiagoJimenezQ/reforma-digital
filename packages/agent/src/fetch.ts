import { lookup as dnsLookup } from 'node:dns';
import https from 'node:https';
import net from 'node:net';
import { officialLevel } from '@reforma-digital/government/domains';

export class FetchError extends Error {
  /** Código HTTP cuando la web ha respondido con un error. */
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

// Direcciones a las que nunca se conecta, aunque un dominio oficial resuelva a ellas. BlockList
// también compara las IPv6 que llevan una IPv4 dentro (::ffff:127.0.0.1, ::ffff:7f00:1).
const privadas = new net.BlockList();
for (const [red, bits] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3],
] as const)
  privadas.addSubnet(red, bits, 'ipv4');
for (const [red, bits] of [
  ['::', 127],
  ['64:ff9b::', 96],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const)
  privadas.addSubnet(red, bits, 'ipv6');

export const direccionPrivada = (ip: string) =>
  privadas.check(ip, net.isIPv6(ip) ? 'ipv6' : 'ipv4');

/**
 * Resuelve el nombre y comprueba la dirección con la que se va a conectar: así no hay una segunda
 * resolución que pueda devolver otra IP (DNS rebinding).
 */
const lookupSeguro: net.LookupFunction = (host, options, callback) => {
  dnsLookup(host, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, '', 0);
    const lista = Array.isArray(addresses) ? addresses : [];
    const publica = lista.find((a) => !direccionPrivada(a.address));
    if (!publica || lista.some((a) => direccionPrivada(a.address)))
      return callback(new FetchError('El dominio apunta a una red privada.'), '', 0);
    if (options.all) return callback(null, [publica]);
    callback(null, publica.address, publica.family);
  });
};

const MAX_BYTES = 12 * 1024 * 1024;

function pedir(url: URL, signal?: AbortSignal) {
  return new Promise<{
    status: number;
    headers: Record<string, string | string[] | undefined>;
    body: Buffer;
  }>((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'GET',
        lookup: lookupSeguro,
        timeout: 20000,
        ...(signal ? { signal } : {}),
        headers: {
          'user-agent': 'ReformaDigital/0.1 (+https://github.com/samuelcorsan/reforma-digital)',
          accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.5',
          'accept-language': 'es-ES,es;q=0.9',
        },
      },
      (res) => {
        const partes: Buffer[] = [];
        let total = 0;
        res.on('data', (chunk: Buffer) => {
          total += chunk.length;
          if (total > MAX_BYTES) {
            req.destroy(new FetchError('La página es demasiado grande.'));
            return;
          }
          partes.push(chunk);
        });
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(partes),
          }),
        );
        res.on('error', reject);
      },
    );
    req.on('timeout', () =>
      req.destroy(new FetchError('La web oficial no ha respondido a tiempo.')),
    );
    req.on('error', reject);
    req.end();
  });
}

export type Pagina = { url: string; titulo: string; texto: string; tipo: 'html' | 'pdf' };

/**
 * Descarga una página de una administración y la devuelve como texto. Solo HTTPS y solo dominios
 * oficiales, también en cada redirección: las herramientas del agente no pueden sacar datos a
 * terceros ni llegar a la red local. `encontrada` es otra web que se puede leer porque la devolvió
 * el buscador, nunca una dirección escrita por el modelo.
 */
export async function leerPaginaOficial(
  url: string,
  opciones: { signal?: AbortSignal; encontrada?: string } = {},
): Promise<Pagina> {
  let actual = new URL(url);
  for (let saltos = 0; saltos <= 5; saltos++) {
    const permitida =
      officialLevel(actual.href) ||
      (actual.protocol === 'https:' && actual.hostname === opciones.encontrada);
    if (!permitida)
      throw new FetchError(`${actual.hostname} no es una web oficial: no se puede leer.`);
    const res = await pedir(actual, opciones.signal);
    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      actual = new URL(String(res.headers.location), actual);
      // Algunas sedes redirigen a http y de ahí otra vez a https: se pide directamente por https.
      if (actual.protocol === 'http:') actual.protocol = 'https:';
      continue;
    }
    if (res.status >= 400)
      throw new FetchError(`La web oficial respondió con un error ${res.status}.`, res.status);
    const tipo = String(res.headers['content-type'] ?? '');
    if (tipo.includes('pdf') || res.body.subarray(0, 5).toString() === '%PDF-') {
      const { extractText } = await import('unpdf');
      const { text } = await extractText(new Uint8Array(res.body), { mergePages: true });
      return {
        url: actual.href,
        titulo: actual.pathname.split('/').pop() ?? '',
        texto: limpiarEspacios(text),
        tipo: 'pdf',
      };
    }
    const html = decodificar(res.body, tipo);
    return { url: actual.href, ...htmlATexto(html, actual), tipo: 'html' };
  }
  throw new FetchError('Demasiadas redirecciones.');
}

function decodificar(body: Buffer, contentType: string): string {
  const declarado =
    /charset=([\w-]+)/i.exec(contentType)?.[1] ??
    /<meta[^>]+charset=["']?([\w-]+)/i.exec(body.subarray(0, 4096).toString('latin1'))?.[1] ??
    'utf-8';
  try {
    return new TextDecoder(declarado.toLowerCase()).decode(body);
  } catch {
    return new TextDecoder('utf-8').decode(body);
  }
}

const ENTIDADES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  aacute: 'á',
  eacute: 'é',
  iacute: 'í',
  oacute: 'ó',
  uacute: 'ú',
  Aacute: 'Á',
  Eacute: 'É',
  Iacute: 'Í',
  Oacute: 'Ó',
  Uacute: 'Ú',
  ntilde: 'ñ',
  Ntilde: 'Ñ',
  uuml: 'ü',
  Uuml: 'Ü',
  iquest: '¿',
  iexcl: '¡',
  ordm: 'º',
  ordf: 'ª',
  euro: '€',
  laquo: '«',
  raquo: '»',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
  middot: '·',
  ccedil: 'ç',
  Ccedil: 'Ç',
  agrave: 'à',
  egrave: 'è',
  ograve: 'ò',
  copy: '©',
  deg: '°',
};

export const decodificarEntidades = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code =
        e[1]?.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTIDADES[e] ?? m;
  });

const limpiarEspacios = (s: string) =>
  s
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/**
 * Texto legible de una página: el contenido principal si lo marca (`<main>`), con titulares,
 * listas, tablas y enlaces en un formato que el modelo entiende y que se puede citar literalmente.
 */
export function htmlATexto(html: string, base: URL): { titulo: string; texto: string } {
  const titulo = decodificarEntidades(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  let h = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|template|svg|head|iframe|select)\b[\s\S]*?<\/\1\s*>/gi, ' ');
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(h)?.[1];
  if (main && main.length > 400) h = main;
  h = h
    .replace(
      /<a\b[^>]*href\s*=\s*["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
      (_m, href: string, texto: string) => {
        const t = texto
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (!t) return ' ';
        try {
          const destino = new URL(decodificarEntidades(href), base);
          return /^https?:$/.test(destino.protocol) ? ` [${t}](${destino.href}) ` : ` ${t} `;
        } catch {
          return ` ${t} `;
        }
      },
    )
    .replace(/<h([1-6])\b[^>]*>/gi, (_m, n: string) => `\n\n${'#'.repeat(Number(n))} `)
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<(td|th)\b[^>]*>/gi, ' | ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(
      /<\/?(p|div|section|article|ul|ol|tr|table|dl|dt|dd|header|footer|nav|aside|form|fieldset|legend|blockquote|figure|figcaption|main)\b[^>]*>/gi,
      '\n',
    )
    .replace(/<[^>]+>/g, ' ');
  return { titulo, texto: limpiarEspacios(decodificarEntidades(h)) };
}
