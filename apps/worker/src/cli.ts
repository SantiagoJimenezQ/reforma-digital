import { readFile } from "node:fs/promises";
import { sources } from "@gov/government";
import { closeDb } from "@gov/db";
import { configSchema, defaultConfig } from "@gov/core";
import { shutdownTracing } from "@gov/ai";
import { crawlSource, dueSources, reindexStored } from "./index";
const args = process.argv.slice(2);
const value = (key: string) => args[args.indexOf(key) + 1];
try {
  const config = args.includes("--config")
    ? configSchema.parse(JSON.parse(await readFile(value("--config")!, "utf8")))
    : defaultConfig;
  const ids = args.includes("--source")
    ? [value("--source")!]
    : args.includes("--all")
      ? sources.map((s) => s.id)
      : args.includes("--due")
        ? (await dueSources()).map((s) => s.id)
        : [];
  if (!ids.length)
    throw new Error(
      "Uso: pnpm crawl --source aeat | --due [--config config.json]",
    );
  const maxPages = args.includes("--max-pages")
    ? Number(value("--max-pages"))
    : undefined;
  if (
    maxPages !== undefined &&
    (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 500)
  )
    throw new Error("--max-pages debe ser un entero entre 1 y 500");
  for (const id of ids) {
    const results = args.includes("--reindex")
      ? await reindexStored(id, config)
      : await crawlSource(id, config, {
          stageOnly: args.includes("--stage-only"),
          seedsOnly: args.includes("--seeds-only"),
          ...(args.includes("--max-pages")
            ? { maxPages: Number(value("--max-pages")) }
            : {}),
        });
    console.log(JSON.stringify({ source: id, results }, null, 2));
    if (results.some((r) => r.status === "error")) process.exitCode = 1;
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await closeDb();
  await shutdownTracing();
}
