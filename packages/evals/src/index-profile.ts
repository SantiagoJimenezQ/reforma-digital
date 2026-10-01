import { createHash } from "node:crypto";
import { indexConfigIdentity, type SearchConfig } from "@gov/core";
export function assertIndexProfile(
  profiles: {
    embedding_model: string | null;
    index_config_hash: string | null;
  }[],
  config: SearchConfig,
): void {
  const expected = createHash("sha256")
    .update(indexConfigIdentity(config))
    .digest("hex");
  if (!profiles.length)
    throw new Error(
      "El corpus consultable está vacío. Ejecuta la ingesta antes de evaluar.",
    );
  if (
    profiles.some(
      (p) =>
        p.embedding_model !== config.embeddingModel ||
        p.index_config_hash !== expected,
    )
  )
    throw new Error(
      "La configuración de embeddings/chunking no coincide con el índice. Reindexa la base de evaluación con --config antes del experimento.",
    );
}
