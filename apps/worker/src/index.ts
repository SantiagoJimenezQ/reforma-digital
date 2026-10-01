import {
  db,
  connection,
  documents,
  chunks,
  documentVersions,
  sourcesTable,
  eq,
} from "@gov/db";
import {
  sources,
  sourceById,
  approvedSource,
  documentJurisdiction,
  documentYear,
  eligibleDocument,
} from "@gov/government";
import {
  Firecrawl,
  fetchBoe,
  hash,
  documentId,
  chunkMarkdown,
  normalizeSourceMarkdown,
  RemovedDocumentError,
  type ScrapedDocument,
} from "@gov/crawler";
import { embeddings } from "@gov/ai";
import {
  defaultConfig,
  indexConfigIdentity,
  type SearchConfig,
} from "@gov/core";
export async function indexDocument(
  sourceId: string,
  doc: ScrapedDocument,
  config: SearchConfig = defaultConfig,
  stageOnly = false,
) {
  const source = sourceById(sourceId);
  if (!approvedSource(doc.canonicalUrl, source.id))
    throw new Error("Fuente no aprobada");
  const markdown = normalizeSourceMarkdown(doc.markdown, sourceId);
  if (markdown.length < 100) throw new Error("Contenido insuficiente");
  const id = documentId(doc.canonicalUrl);
  if (!eligibleDocument(source, doc.title, doc.canonicalUrl)) {
    await db()
      .update(documents)
      .set({ indexable: false })
      .where(eq(documents.id, id));
    return { status: "excluded", id, chunks: 0 };
  }
  const contentHash = hash(doc.title + "\n" + markdown);
  const indexConfigHash =
    (stageOnly ? "staged-" : "") + hash(indexConfigIdentity(config));
  const previous = (
    await db().select().from(documents).where(eq(documents.id, id))
  )[0];
  if (
    previous?.contentHash === contentHash &&
    previous.indexConfigHash === indexConfigHash
  ) {
    await db()
      .update(documents)
      .set({
        validUntil: doc.validUntil
          ? new Date(doc.validUntil)
          : doc.validUntil === null
            ? null
            : previous.validUntil,
        indexable: !stageOnly,
        jurisdiction: documentJurisdiction(source, doc.title, doc.canonicalUrl),
        applicabilityYear: documentYear(doc.title, doc.canonicalUrl),
        crawledAt: doc.crawledAt ? new Date(doc.crawledAt) : new Date(),
        available: true,
        unavailableAt: null,
        sourceUpdatedAt: doc.sourceUpdatedAt
          ? new Date(doc.sourceUpdatedAt)
          : previous.sourceUpdatedAt,
      })
      .where(eq(documents.id, id));
    return { status: "unchanged", id, chunks: 0 };
  }
  const parts = chunkMarkdown(
    markdown,
    doc.title,
    config.chunkSize,
    config.chunkOverlap,
  );
  const embedded = stageOnly
    ? null
    : await embeddings(
        parts.map((p) => p.heading + "\n" + p.content),
        config,
      );
  if (
    embedded &&
    (embedded.embeddings.length !== parts.length ||
      embedded.embeddings.some(
        (v) =>
          v.length !== config.embeddingDimensions ||
          v.some((n) => !Number.isFinite(n)),
      ))
  )
    throw new Error("Embeddings incompatibles");
  await db().transaction(async (tx) => {
    await tx.execute(
      (await import("@gov/db"))
        .sql`SELECT pg_advisory_xact_lock(hashtext(${id}))`,
    );
    const old = (
      await tx.select().from(documents).where(eq(documents.id, id))
    )[0];
    if (old)
      await tx.insert(documentVersions).values({
        documentId: id,
        contentHash: old.contentHash,
        markdown: old.markdown,
      });
    const row = {
      id,
      sourceId,
      validUntil: doc.validUntil
        ? new Date(doc.validUntil)
        : doc.validUntil === null
          ? null
          : (previous?.validUntil ?? null),
      canonicalUrl: doc.canonicalUrl,
      title: doc.title,
      content: markdown,
      markdown,
      organization: source.organization,
      jurisdiction: documentJurisdiction(source, doc.title, doc.canonicalUrl),
      applicabilityYear: documentYear(doc.title, doc.canonicalUrl),
      authorityScore: source.authorityScore,
      publishedAt: doc.publishedAt ? new Date(doc.publishedAt) : null,
      sourceUpdatedAt: doc.sourceUpdatedAt
        ? new Date(doc.sourceUpdatedAt)
        : null,
      crawledAt: doc.crawledAt ? new Date(doc.crawledAt) : new Date(),
      contentHash,
      indexable: !stageOnly,
      available: true,
      unavailableAt: null,
      embeddingModel: stageOnly ? null : config.embeddingModel,
      indexConfigHash,
    };
    await tx
      .insert(documents)
      .values(row)
      .onConflictDoUpdate({ target: documents.id, set: row });
    await tx.delete(chunks).where(eq(chunks.documentId, id));
    for (let start = 0; start < parts.length; start += 40)
      await tx.insert(chunks).values(
        parts.slice(start, start + 40).map((p, i) => ({
          ...p,
          id: hash(
            id + contentHash + indexConfigHash + String(start + i),
          ).slice(0, 32),
          documentId: id,
          embedding: embedded?.embeddings[start + i] ?? null,
        })),
      );
  });
  return { status: previous ? "updated" : "created", id, chunks: parts.length };
}
export async function crawlSource(
  sourceId: string,
  config: SearchConfig = defaultConfig,
  options: { stageOnly?: boolean; maxPages?: number; seedsOnly?: boolean } = {},
) {
  const registered = sourceById(sourceId);
  const s = {
    ...registered,
    crawlConfig: {
      ...registered.crawlConfig,
      maxPages: options.maxPages ?? registered.crawlConfig.maxPages,
    },
  };
  const { hosts: _, ...row } = s;
  await db().insert(sourcesTable).values(row).onConflictDoNothing();
  // Session-level lock keeps concurrent workers from crawling the same source.
  const lock = await connection().reserve();
  const result =
    await lock`SELECT pg_try_advisory_lock(hashtext(${s.id})) AS acquired`;
  if (!result[0]?.acquired) {
    lock.release();
    throw new Error("Esta fuente ya se está procesando");
  }
  try {
    const fire = s.sourceType === "web" ? new Firecrawl() : null;
    const known = await db()
      .select({ url: documents.canonicalUrl })
      .from(documents)
      .where(eq(documents.sourceId, s.id));
    const urls =
      s.sourceType === "boe-api" || options.seedsOnly
        ? s.crawlConfig.seeds
        : [
            ...new Set([
              ...(await fire!.discover(s)),
              ...known.map((d) => d.url),
            ]),
          ];
    const summary: { url: string; status: string; error?: string }[] = [];
    for (const url of urls) {
      try {
        const doc =
          s.sourceType === "boe-api"
            ? await fetchBoe(url)
            : await fire!.scrape(url, s);
        const r = await indexDocument(s.id, doc, config, options.stageOnly);
        summary.push({ url, status: r.status });
      } catch (e) {
        if (e instanceof RemovedDocumentError) {
          const canonical =
            s.sourceType === "boe-api"
              ? `https://www.boe.es/buscar/act.php?id=${url}`
              : url;
          await db()
            .update(documents)
            .set({
              available: false,
              unavailableAt: new Date(),
              crawledAt: new Date(),
            })
            .where(eq(documents.id, documentId(canonical)));
          summary.push({ url, status: "unavailable" });
        } else
          summary.push({
            url,
            status: "error",
            error: e instanceof Error ? e.message : "Error desconocido",
          });
      }
    }
    if (!summary.some((r) => r.status === "error"))
      await db()
        .update(sourcesTable)
        .set({ lastCrawledAt: new Date() })
        .where(eq(sourcesTable.id, s.id));
    return summary;
  } finally {
    await lock`SELECT pg_advisory_unlock(hashtext(${s.id}))`;
    lock.release();
  }
}
export async function dueSources() {
  const indexed = await db().select().from(sourcesTable);
  return sources.filter((s) => {
    const last = indexed.find((i) => i.id === s.id)?.lastCrawledAt;
    return (
      s.enabled &&
      (!last ||
        Date.now() - last.getTime() > s.crawlConfig.recrawlHours * 3600000)
    );
  });
}

export async function reindexStored(
  sourceId: string,
  config: SearchConfig = defaultConfig,
) {
  sourceById(sourceId);
  const stored = await db()
    .select()
    .from(documents)
    .where(eq(documents.sourceId, sourceId));
  const results = [];
  for (const doc of stored.filter((d) => d.available))
    results.push(
      await indexDocument(
        sourceId,
        {
          canonicalUrl: doc.canonicalUrl,
          title: doc.title,
          markdown: doc.markdown,
          crawledAt: doc.crawledAt.toISOString(),
          validUntil: doc.validUntil?.toISOString() ?? null,
          sourceUpdatedAt: doc.sourceUpdatedAt?.toISOString() ?? null,
          publishedAt: doc.publishedAt?.toISOString() ?? null,
        },
        config,
      ),
    );
  return results;
}
