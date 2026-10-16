import { generateText } from 'ai';
import { approvedSource, canonicalize } from '@reforma-digital/government';
import {
  officialDomains,
  officialLevel,
  type AdministrationLevel,
} from '@reforma-digital/government/domains';
import type { Proveedor } from './models';

export type Fuente = {
  id: string;
  url: string;
  titulo: string;
  /** Nivel de la administración según el dominio. */
  nivel: AdministrationLevel;
  /** Organismo, si el dominio es una fuente registrada del buscador de Reforma Digital. */
  organismo?: string;
  texto: string;
  origen: 'busqueda' | 'pagina';
  consultada: string;
};

/** Webs oficiales consultadas en un trámite: se muestran debajo de cada respuesta. */
export class Fuentes {
  private porUrl = new Map<string, Fuente>();
  constructor(iniciales: Fuente[] = []) {
    for (const f of iniciales) this.porUrl.set(f.url, f);
  }
  lista = () => [...this.porUrl.values()];
  obtener = (idOUrl: string) =>
    this.porUrl.get(idOUrl) ?? this.lista().find((f) => f.id === idOUrl.trim().toUpperCase());

  añadir(url: string, titulo: string, texto: string, origen: Fuente['origen']): Fuente | undefined {
    const nivel = officialLevel(url);
    if (!nivel) return;
    const canonica = canonicalize(url);
    const previa = this.porUrl.get(canonica);
    if (previa) {
      // El texto completo de la página sustituye al extracto; un extracto nuevo se suma.
      if (origen === 'pagina')
        Object.assign(previa, { texto, origen, titulo: titulo || previa.titulo });
      else if (!previa.texto.includes(texto)) previa.texto += '\n\n' + texto;
      previa.consultada = new Date().toISOString();
      return previa;
    }
    const registrada = approvedSource(canonica);
    const fuente: Fuente = {
      id: `F${this.porUrl.size + 1}`,
      url: canonica,
      titulo: titulo || new URL(canonica).hostname,
      nivel,
      ...(registrada ? { organismo: registrada.organization } : {}),
      texto,
      origen,
      consultada: new Date().toISOString(),
    };
    this.porUrl.set(canonica, fuente);
    return fuente;
  }
}

// Parallel acepta unas decenas de dominios por búsqueda: Estado, comunidades y plataformas de sedes
// municipales. Los ayuntamientos concretos se piden con `dominios`.
export const DOMINIOS_POR_DEFECTO = [
  ...officialDomains.filter((d) => d.level !== 'local').map((d) => d.suffix),
  'sedelectronica.es',
  'sedelectronica.gal',
  'eadministracio.cat',
  'egoitzaelektronikoa.eus',
];

export type Resultado = { url: string; titulo: string; extracto: string };

/** Limpia el ruido de menús que traen los extractos: enlaces sueltos y viñetas vacías. */
export function limpiarExtracto(texto: string): string {
  return texto
    .split('\n')
    .filter((l) => !/^\s*[*+-]?\s*\[[^\]]*\]\([^)]*\)\s*$/.test(l) && l.trim() !== '...')
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Busca en la web limitándose a dominios oficiales. La búsqueda la ejecuta el proveedor (Parallel
 * en Vercel AI Gateway, o el motor Parallel de OpenRouter) a través de un modelo pequeño que solo
 * hace una llamada; el agente recibe los resultados ya filtrados.
 */
export async function buscarEnWebsOficiales(
  consulta: string,
  dominios: string[],
  proveedor: Proveedor,
  signal?: AbortSignal,
): Promise<{ resultados: Resultado[]; costeUsd: number | null }> {
  const max = 8;
  const instrucciones =
    'Llama una sola vez a la herramienta de búsqueda con la consulta tal cual y no escribas nada más.';
  if (proveedor.tipo === 'gateway') {
    const r = await generateText({
      model: proveedor.rapido,
      reasoning: 'none',
      tools: {
        buscar: proveedor.gateway.tools.parallelSearch({
          maxResults: max,
          mode: 'agentic',
          sourcePolicy: { includeDomains: dominios },
          excerpts: { maxCharsPerResult: 2500 },
        }),
      },
      toolChoice: { type: 'tool', toolName: 'buscar' },
      providerOptions: { openai: { maxToolCalls: 1 } },
      instructions: instrucciones,
      prompt: consulta,
      maxOutputTokens: 300,
      ...(signal ? { abortSignal: signal } : {}),
    });
    const resultados: Resultado[] = [];
    for (const tr of r.toolResults) {
      const out: unknown = tr.output;
      if (!out || typeof out !== 'object' || !('results' in out) || !Array.isArray(out.results))
        continue;
      for (const x of out.results as { url?: unknown; title?: unknown; excerpts?: unknown }[]) {
        if (typeof x.url !== 'string') continue;
        const extractos = Array.isArray(x.excerpts)
          ? x.excerpts.filter((e) => typeof e === 'string')
          : [];
        resultados.push({
          url: x.url,
          titulo: typeof x.title === 'string' ? x.title : '',
          extracto: limpiarExtracto(extractos.join('\n\n')),
        });
      }
    }
    return { resultados, costeUsd: coste(r.providerMetadata) };
  }
  // OpenRouter: el mismo motor con su herramienta de servidor, como en el buscador web.
  const r = await generateText({
    model: proveedor.modeloBusquedaOpenRouter(dominios, max),
    instructions: instrucciones,
    prompt: consulta,
    maxOutputTokens: 1500,
    ...(signal ? { abortSignal: signal } : {}),
  });
  const resultados = r.sources.flatMap((s): Resultado[] => {
    const contenido = s.providerMetadata?.openrouter?.content;
    return s.sourceType === 'url' && typeof contenido === 'string'
      ? [{ url: s.url, titulo: s.title ?? '', extracto: limpiarExtracto(contenido) }]
      : [];
  });
  return { resultados, costeUsd: coste(r.providerMetadata) };
}

export function coste(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const m = metadata as {
    gateway?: { cost?: unknown };
    openrouter?: { usage?: { cost?: unknown } };
  };
  const raw = m.gateway?.cost ?? m.openrouter?.usage?.cost;
  const n = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}
