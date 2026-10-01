import { createHash } from "node:crypto";
import { z } from "zod";
import { XMLParser } from "fast-xml-parser";
import {
  approvedSource,
  canonicalize,
  eligibleDocument,
} from "@gov/government";
import type { Source } from "@gov/core";
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const documentId = (url: string) => hash(canonicalize(url)).slice(0, 24);
export type ScrapedDocument = {
  canonicalUrl: string;
  title: string;
  markdown: string;
  sourceUpdatedAt: string | null;
  publishedAt: string | null;
  crawledAt?: string;
  validUntil?: string | null;
};
const linkSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  description: z.string().optional(),
});
export function classifyUrl(link: z.infer<typeof linkSchema>): number {
  const text = (
    link.url +
    " " +
    (link.title ?? "") +
    " " +
    (link.description ?? "")
  )
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (
    /(?:\/|\b)(prensa|noticias|noticia|galeria|hemeroteca|sala-de-prensa|revista|observatorio|mapaweb|sitemap|aviso-legal|politica-de-privacidad)(?:\/|\b)|[?&](print|imprimir)=|\.(jpg|png|mp4|css|js)(\?|$)/.test(
      text,
    )
  )
    return -1;
  if (/\/en_gb\/|\/ca_es\/|\/gl_es\/|\/(ca|va|gl|eu|en)\//.test(text))
    return -1;
  const years = [...text.matchAll(/(?:irpf-|manual[^/]*?)(20\d{2})/g)].map(
    (m) => Number(m[1]),
  );
  if (years.some((y) => y < new Date().getUTCFullYear() - 1)) return -1;
  return /tramite|procedimiento|requisito|faq|ayuda|normativa|formulario|documentacion|prestacion|informe|solicitud|beca/.test(
    text,
  )
    ? 2
    : 0;
}
export function normalizeMarkdown(markdown: string): string {
  return markdown
    .normalize("NFC")
    .replace(/\r\n/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
export class RemovedDocumentError extends Error {}
export class Firecrawl {
  constructor(private key = process.env.FIRECRAWL_API_KEY) {
    if (!key) throw new Error("FIRECRAWL_API_KEY no configurada");
  }
  private async request(endpoint: string, body: unknown): Promise<unknown> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const r = await fetch("https://api.firecrawl.dev/v2/" + endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90000),
      });
      if ((r.status === 429 || r.status >= 500) && attempt < 3) {
        const retry = Number(r.headers.get("retry-after"));
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            Math.min(
              60000,
              Number.isFinite(retry) && retry > 0
                ? retry * 1000
                : r.status === 429
                  ? 15000 * 2 ** attempt
                  : 1000 * 2 ** attempt,
            ),
          ),
        );
        continue;
      }
      if (!r.ok) throw new Error(`Firecrawl ${endpoint}: HTTP ${r.status}`);
      return r.json();
    }
    throw new Error("Firecrawl reintentos agotados");
  }
  async discover(source: Source): Promise<string[]> {
    // map with sitemap=include discovers sitemap and links before any bulk scraping.
    const result = z
      .object({ success: z.literal(true), links: z.array(linkSchema) })
      .parse(
        await this.request("map", {
          url: source.baseUrl,
          sitemap: "include",
          includeSubdomains: false,
          ignoreQueryParameters: false,
          limit: source.crawlConfig.maxPages * 5,
          location: { country: "ES", languages: ["es"] },
        }),
      );
    return [
      ...new Set([
        ...source.crawlConfig.seeds,
        ...result.links
          .filter(
            (l) =>
              eligibleDocument(source, l.title ?? "", l.url) &&
              classifyUrl(l) > 0,
          )
          .sort(
            (a, b) =>
              discoveryPriority(b, source) - discoveryPriority(a, source),
          )
          .map((l) => canonicalize(l.url)),
      ]),
    ].slice(0, source.crawlConfig.maxPages);
  }
  async scrape(url: string, source: Source): Promise<ScrapedDocument> {
    if (!approvedSource(url, source.id))
      throw new Error("URL fuera del registro");
    const response = z
      .object({
        success: z.boolean(),
        data: z
          .object({
            markdown: z.string().optional(),
            metadata: z.record(z.string(), z.unknown()).optional(),
          })
          .optional(),
      })
      .parse(
        await this.request("scrape", {
          url,
          formats: ["markdown"],
          // PAG's main-content heuristic discards the procedure and retains an
          // empty table. Its explicit <main> contains the authoritative article.
          onlyMainContent: source.id !== "administracion",
          ...(source.id === "administracion" ? { includeTags: ["main"] } : {}),
          maxAge: 0,
          timeout: 60000,
        }),
      );
    const m = response.data?.metadata ?? {};
    if (m.statusCode === 404 || m.statusCode === 410)
      throw new RemovedDocumentError(url);
    if (
      !response.success ||
      !response.data?.markdown ||
      (typeof m.statusCode === "number" && m.statusCode >= 400)
    )
      throw new Error("Scrape fallido o vacío");
    const final = String(m.url ?? m.sourceURL ?? url);
    if (!approvedSource(final, source.id))
      throw new Error("Redirección fuera del registro");
    const canonical = String(m.canonicalURL ?? m.canonicalUrl ?? final);
    if (!approvedSource(canonical, source.id))
      throw new Error("Canónica fuera del registro");
    const date = (v: unknown) =>
      typeof v === "string" && !Number.isNaN(Date.parse(v))
        ? new Date(v).toISOString()
        : null;
    return {
      canonicalUrl: canonicalize(canonical),
      title: String(m.title ?? url),
      markdown: normalizeMarkdown(response.data.markdown),
      sourceUpdatedAt: date(m["article:modified_time"] ?? m.modifiedTime),
      publishedAt: date(m["article:published_time"]),
    };
  }
}
export type Chunk = {
  content: string;
  heading: string;
  position: number;
  tokenCount: number;
};
const tokens = (s: string) => Math.ceil(s.length / 3.5);
export function chunkMarkdown(
  markdown: string,
  title: string,
  target = 600,
  overlap = 70,
): Chunk[] {
  if (target < 200 || overlap < 0 || overlap >= target)
    throw new Error("Configuración de chunk inválida");
  const chunks: Chunk[] = [];
  const headings: string[] = [];
  let blocks: string[] = [];
  const heading = () => [title, ...headings.filter(Boolean)].join(" > ");
  const flush = (keepOverlap: boolean) => {
    if (!blocks.length) return;
    const content = blocks.join("\n\n");
    chunks.push({
      content,
      heading: heading(),
      position: chunks.length,
      tokenCount: tokens(content),
    });
    const last = blocks.at(-1) ?? "";
    blocks = keepOverlap && tokens(last) <= overlap ? [last] : [];
  };
  for (const section of normalizeMarkdown(markdown).split(/\n\s*\n/)) {
    // Split at heading boundaries even when the source omitted the blank line.
    for (const block of section.split(/\n(?=#{1,6} )/)) {
      const match = /^(#{1,6})\s+(.+)(?:\n([\s\S]*))?$/.exec(block);
      if (match) {
        flush(false);
        headings.length = match[1]!.length;
        headings[match[1]!.length - 1] = match[2]!;
        if (!match[3]) continue;
      }
      const text = match?.[3] ?? block;
      // Paragraph/list/table blocks stay intact when possible. Oversized blocks split on lines/sentences.
      const parts =
        tokens(text) > target ? text.split(/\n|(?<=[.!?])\s+/) : [text];
      for (const part of parts) {
        const bounded =
          tokens(part) > target
            ? (part.match(
                new RegExp(
                  `.{1,${Math.floor(target * 3.5)}}(?:\\s|$)|.{1,${Math.floor(target * 3.5)}}`,
                  "gs",
                ),
              ) ?? [part])
            : [part];
        for (const p of bounded) {
          if (tokens([...blocks, p].join("\n\n")) > target) flush(true);
          blocks.push(p);
        }
      }
    }
  }
  flush(false);
  return chunks;
}
export async function fetchBoe(id: string): Promise<ScrapedDocument> {
  if (!/^BOE-A-\d{4}-\d+$/.test(id))
    throw new Error("Identificador BOE inválido");
  const r = await fetch(
    `https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/${id}/texto`,
    {
      headers: { Accept: "application/xml" },
      signal: AbortSignal.timeout(30000),
    },
  );
  if (r.status === 404 || r.status === 410) throw new RemovedDocumentError(id);
  if (!r.ok) throw new Error(`BOE HTTP ${r.status}`);
  const xml = await r.text();
  const metadataResponse = await fetch(
    `https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/${id}/metadatos`,
    {
      headers: { Accept: "application/xml" },
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!metadataResponse.ok)
    throw new Error("No se ha podido comprobar la vigencia del BOE");
  const metadata = z
    .object({
      titulo: z.string(),
      fecha_publicacion: z.union([z.number(), z.string()]),
      estatus_derogacion: z.string(),
      estatus_anulacion: z.string(),
      vigencia_agotada: z.string(),
    })
    .parse(
      new XMLParser().parse(await metadataResponse.text()).response?.data
        ?.metadatos,
    );
  const expired = [
    metadata.estatus_derogacion,
    metadata.estatus_anulacion,
    metadata.vigencia_agotada,
  ].some((v) => v === "S");
  // Select only the latest version of each block, never mix historical versions.
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (name) => ["bloque", "version"].includes(name),
  });
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const sections: string[] = [];
  let latest = "";
  function walk(node: unknown): void {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    if (Array.isArray(o.version)) {
      const versions = o.version as Record<string, unknown>[];
      const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");
      const v = versions
        .filter(
          (v) =>
            String(v["@_fecha_publicacion"] ?? "") <= today &&
            String(v["@_fecha_vigencia"] ?? "") <= today,
        )
        .sort((a, b) =>
          String(b["@_fecha_publicacion"] ?? "").localeCompare(
            String(a["@_fecha_publicacion"] ?? ""),
          ),
        )[0];
      if (v) {
        const date = String(v["@_fecha_publicacion"] ?? "");
        if (date > latest) latest = date;
        sections.push("## " + String(o["@_titulo"] ?? o["@_id"] ?? ""));
        collect(v);
      }
      return;
    }
    Object.values(o).forEach(walk);
  }
  function collect(node: unknown): void {
    if (typeof node === "string" || typeof node === "number")
      sections.push(String(node));
    else if (Array.isArray(node)) node.forEach(collect);
    else if (node && typeof node === "object")
      for (const [k, v] of Object.entries(node))
        if (!k.startsWith("@_")) collect(v);
  }
  walk(parsed);
  if (sections.join("").length < 100)
    throw new Error("Formato BOE no reconocido; no se indexa");
  const date = /^\d{8}$/.test(latest)
    ? `${latest.slice(0, 4)}-${latest.slice(4, 6)}-${latest.slice(6, 8)}T00:00:00Z`
    : null;
  return {
    canonicalUrl: `https://www.boe.es/buscar/act.php?id=${id}`,
    title: metadata.titulo,
    markdown: sections.join("\n\n"),
    sourceUpdatedAt: date,
    publishedAt: String(metadata.fecha_publicacion).replace(
      /^(\d{4})(\d{2})(\d{2})$/,
      "$1-$2-$3T00:00:00Z",
    ),
    validUntil: expired ? new Date().toISOString() : null,
  };
}

export function discoveryPriority(
  link: { url: string; title?: string; description?: string },
  source: Source,
): number {
  const text = (
    link.url +
    " " +
    (link.title ?? "") +
    " " +
    (link.description ?? "")
  )
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[-_+/]/g, " ");
  return (
    classifyUrl(link) +
    (source.crawlConfig.priorityTerms ?? []).reduce(
      (score, term) => score + (text.includes(term.toLowerCase()) ? 5 : 0),
      0,
    )
  );
}

/** Remove observed publisher chrome, keeping every procedural section after the main heading. */
export function normalizeSourceMarkdown(
  markdown: string,
  sourceId: string,
): string {
  let text = normalizeMarkdown(markdown);
  if (sourceId === "administracion") {
    const start = text.search(/^# /m);
    if (start >= 0) text = text.slice(start);
  }
  if (sourceId === "seg-social") {
    const start = text.search(/^# /m);
    if (start >= 0) text = text.slice(start);
    const end = text.search(/^## Did you find this page useful\?/m);
    if (end >= 0) text = text.slice(0, end);
  }
  if (sourceId === "ayuntamiento-madrid") {
    const start = text.indexOf("## Descripción");
    if (start >= 0) text = text.slice(start);
  }
  if (sourceId === "sepe") {
    const start = text.search(
      /^#{1,2} (Prestación|Prestaciones|Qué se considera)/m,
    );
    if (start >= 0) text = text.slice(start);
  }
  return normalizeMarkdown(text);
}
