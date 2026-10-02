import { search, shutdownTracing } from "../packages/ai/src/index";
import { connection, closeDb } from "../packages/db/src/index";

try {
  const result = await search("Cómo obtener mi vida laboral", {
    mode: "live",
    retrievalOnly: true,
  });
  if (!result.evidence.length)
    throw new Error("Web Search no devolvió fragmentos oficiales");
  console.log(
    `OpenRouter Web Search: ${result.evidence.length} fuentes oficiales; ${result.config.generationModel}; reasoning=${result.config.reasoningEffort}`,
  );
  if (process.env.DATABASE_URL) {
    await connection()`SELECT 1`;
    console.log("PostgreSQL: ok");
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : "Diagnóstico fallido");
  process.exitCode = 1;
} finally {
  await closeDb();
  await shutdownTracing();
}
