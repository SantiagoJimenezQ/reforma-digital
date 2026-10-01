import { connection } from "@gov/db";
import type { SearchConfig } from "@gov/core";
import type { Metrics, CaseResult } from "./metrics";
export type Report = {
  id: string;
  metadata: {
    gitCommit: string;
    dirty: boolean;
    codeHash?: string;
    timestamp: string;
    datasetVersion: string;
    datasetHash: string;
    corpusHash: string;
    corpusStable?: boolean;
    model: string;
    embeddingModel: string;
    reranker: string;
    promptVersion: string;
    retrievalConfig: SearchConfig;
    mode: "preview" | "live";
    retrievalOnly: boolean;
    judges: boolean;
    reviewedCases: number;
    totalCases: number;
    evaluatorVersion: string;
  };
  metrics: Metrics;
  categories: Record<string, Metrics>;
  cases: CaseResult[];
  approved: boolean;
  approvedBy?: string;
};
export function compareReports(
  current: Report,
  baseline: Report,
): {
  deltas: Metrics;
  regressions: { id: string; query: string; delta: number }[];
  warnings: string[];
} {
  if (
    current.metadata.corpusStable === false ||
    baseline.metadata.corpusStable === false
  )
    throw new Error(
      "El corpus cambió durante un experimento; comparación inválida",
    );
  const mismatches = (
    [
      "datasetVersion",
      "datasetHash",
      "mode",
      "retrievalOnly",
      "judges",
      "evaluatorVersion",
    ] as const
  ).filter((k) => current.metadata[k] !== baseline.metadata[k]);
  if (mismatches.length)
    throw new Error("Comparación inválida: difieren " + mismatches.join(", "));
  const deltas: Metrics = {};
  for (const [k, v] of Object.entries(current.metrics)) {
    const b = baseline.metrics[k];
    deltas[k] = typeof v === "number" && typeof b === "number" ? v - b : null;
  }
  const regressions = current.cases
    .flatMap((c) => {
      const b = baseline.cases.find((b) => b.case.id === c.case.id);
      const delta = c.failures.length - (b?.failures.length ?? 0);
      return delta > 0 ? [{ id: c.case.id, query: c.case.query, delta }] : [];
    })
    .sort((a, b) => b.delta - a.delta);
  const warnings: string[] = [];
  if (current.metadata.codeHash !== baseline.metadata.codeHash)
    warnings.push(
      "El código de la pipeline ha cambiado; la comparación no aísla solo la configuración.",
    );
  return {
    deltas,
    regressions,
    warnings: [
      ...warnings,
      ...(current.metadata.corpusHash !== baseline.metadata.corpusHash
        ? [
            "El corpus ha cambiado: revisar cambios de crawling/indexación junto a la configuración.",
          ]
        : []),
    ],
  };
}
export async function listReports(): Promise<Report[]> {
  if (!process.env.DATABASE_URL) return [];
  const rows =
    await connection()`SELECT report FROM experiments ORDER BY created_at DESC LIMIT 30`;
  return rows.map((r) => r.report as Report);
}
