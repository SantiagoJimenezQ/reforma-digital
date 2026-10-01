import { embedding, shutdownTracing } from "../packages/ai/src/index";
import { defaultConfig } from "../packages/core/src/index";
import { connection, closeDb } from "../packages/db/src/index";
const checks = [
  [
    "PostgreSQL + pgvector",
    async () => {
      await connection()`SELECT '[1,2,3]'::vector`;
      return "ok";
    },
  ],
  [
    "OpenRouter embeddings",
    async () => {
      const r = await embedding("informe de vida laboral", defaultConfig);
      return `${r.embedding.length} dimensiones; ${r.usage.tokens} tokens`;
    },
  ],
  [
    "Firecrawl",
    async () => {
      const r = await fetch("https://api.firecrawl.dev/v2/team/credit-usage", {
        headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return "autenticado";
    },
  ],
  [
    "Langfuse",
    async () => {
      const r = await fetch(
        `${process.env.LANGFUSE_BASE_URL}/api/public/datasets?limit=1`,
        {
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(
                `${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`,
              ).toString("base64"),
          },
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return "autenticado";
    },
  ],
] as const;
try {
  for (const [name, check] of checks) {
    try {
      console.log(name + ": " + (await check()));
    } catch (e) {
      const error = e as { name?: string; statusCode?: number; code?: string };
      console.log(
        name +
          ": FAILED " +
          (error.statusCode ?? error.code ?? error.name ?? "Error"),
      );
      process.exitCode = 1;
    }
  }
} finally {
  await closeDb();
  await shutdownTracing();
}
