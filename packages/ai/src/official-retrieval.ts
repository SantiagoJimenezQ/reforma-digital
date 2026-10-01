import {
  normalizeText,
  type Evidence,
  type QueryUnderstanding,
  type SearchConfig,
} from "@gov/core";
import { approvedSource, canonicalize, sources } from "@gov/government";

export function generationAvailable(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY || process.env.AI_GATEWAY_API_KEY);
}

export function selectOfficialSeeds(
  q: QueryUnderstanding,
  limit = 2,
): { sourceId: string; url: string; score: number }[] {
  const ranked: { sourceId: string; url: string; score: number }[] = [];
  for (const source of sources) {
    if (!source.enabled || source.sourceType !== "web") continue;
    if (
      q.likelyOrganizations.length &&
      !q.likelyOrganizations.includes(source.id)
    )
      continue;
    for (const seed of source.crawlConfig.seeds) {
      if (!seed.startsWith("https://") || !approvedSource(seed, source.id))
        continue;
      const hay = normalizeText(
        `${seed} ${source.name} ${(source.crawlConfig.priorityTerms ?? []).join(" ")}`,
      );
      const score = q.keywords.filter((keyword) =>
        hay.includes(normalizeText(keyword)),
      ).length;
      if (score > 0) ranked.push({ sourceId: source.id, url: seed, score });
    }
  }
  return ranked
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url))
    .slice(0, limit);
}

function htmlToText(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|h[1-6]|li|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function documentId(url: string): string {
  return canonicalize(url).replace(/[^a-z0-9]+/gi, "").slice(-24);
}

function challenged(html: string): boolean {
  return /just a moment|cf-mitigated|cdn-cgi\/challenge/i.test(html);
}

async function scrapeOfficial(
  url: string,
  sourceId: string,
): Promise<{ title: string; text: string; canonicalUrl: string } | null> {
  if (process.env.FIRECRAWL_API_KEY) {
    const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: sourceId !== "administracion",
        ...(sourceId === "administracion" ? { includeTags: ["main"] } : {}),
        timeout: 45000,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (response.ok) {
      const body = (await response.json()) as {
        success?: boolean;
        data?: {
          markdown?: string;
          metadata?: Record<string, unknown>;
        };
      };
      const markdown = body.data?.markdown?.trim();
      const meta = body.data?.metadata ?? {};
      const finalUrl = String(meta.canonicalURL ?? meta.canonicalUrl ?? meta.url ?? url);
      if (
        body.success &&
        markdown &&
        markdown.length >= 80 &&
        !challenged(markdown) &&
        approvedSource(finalUrl, sourceId)
      ) {
        return {
          title: String(meta.title ?? sources.find((s) => s.id === sourceId)?.name ?? url),
          text: markdown,
          canonicalUrl: canonicalize(finalUrl),
        };
      }
    }
  }
  const response = await fetch(url, {
    redirect: "follow",
    headers: { Accept: "text/html", "Accept-Language": "es" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return null;
  const finalUrl = response.url || url;
  if (!approvedSource(finalUrl, sourceId)) return null;
  const html = await response.text();
  if (challenged(html)) return null;
  const title =
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ||
    sources.find((item) => item.id === sourceId)?.name ||
    url;
  const text = htmlToText(html);
  if (text.length < 80) return null;
  return { title, text, canonicalUrl: canonicalize(finalUrl) };
}

export async function retrieveOfficialSeeds(
  q: QueryUnderstanding,
  config: SearchConfig,
): Promise<Evidence[]> {
  const picked = selectOfficialSeeds(q);
  if (!picked.length) return [];
  const now = new Date().toISOString();
  const pages = await Promise.all(
    picked.map(async ({ sourceId, url }) => {
      const source = sources.find((item) => item.id === sourceId);
      if (!source) return [];
      try {
        const doc = await scrapeOfficial(url, source.id);
        if (!doc) return [];
        const blocks = doc.text
          .split(/\n\s*\n/)
          .map((block) => block.replace(/^#{1,6}\s+/, "").trim())
          .filter((block) => block.length >= 40)
          .slice(0, config.evidenceChunksPerDocument);
        const id = documentId(doc.canonicalUrl);
        return blocks.map((content, position) => ({
          chunkId: `${id}-${position}`,
          documentId: id,
          sourceId: source.id,
          canonicalUrl: doc.canonicalUrl,
          title: doc.title,
          heading: doc.title,
          content: content.slice(0, 1800),
          organization: source.organization,
          jurisdiction: source.jurisdictionValue,
          authorityScore: source.authorityScore,
          crawledAt: now,
          sourceUpdatedAt: null,
          score: 1,
          available: true,
        }));
      } catch {
        return [];
      }
    }),
  );
  return pages.flat();
}
