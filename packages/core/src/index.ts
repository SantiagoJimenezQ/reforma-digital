import { z } from "zod";
export type Jurisdiction = string;
export type Source = {
  id: string;
  name: string;
  baseUrl: string;
  hosts: string[];
  organization: string;
  jurisdictionType: "country" | "region" | "municipality";
  jurisdictionValue: Jurisdiction;
  sourceType: "web" | "boe-api";
  authorityScore: number;
  enabled: boolean;
  crawlConfig: {
    seeds: string[];
    maxPages: number;
    recrawlHours: number;
    includePaths?: string[];
    priorityTerms?: string[];
  };
};
export type Evidence = {
  chunkId: string;
  documentId: string;
  sourceId: string;
  canonicalUrl: string;
  title: string;
  heading: string;
  content: string;
  organization: string;
  jurisdiction: Jurisdiction;
  authorityScore: number;
  crawledAt: string;
  sourceUpdatedAt: string | null;
  score: number;
  available: boolean;
  validUntil?: string | null;
  applicabilityYear?: number | null;
};
export type QueryUnderstanding = {
  normalizedQuery: string;
  intent: string;
  location?: string;
  jurisdiction?: Jurisdiction;
  likelyOrganizations: string[];
  keywords: string[];
  clarification?: string;
  temporal: boolean;
  requestedYear?: number;
};
export const answerSchema = z.object({
  status: z.enum(["answered", "insufficient_evidence", "needs_clarification"]),
  answer: z.string().max(1800),
  claims: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().max(900),
        kind: z.enum(["step", "document", "cost", "deadline", "fact"]),
      }),
    )
    .max(16),
  citations: z
    .array(
      z.object({
        claimId: z.string(),
        documentId: z.string(),
        chunkId: z.string(),
        quote: z.string().min(8).max(12000),
      }),
    )
    .max(40),
  relatedOfficialLinks: z.array(z.object({ documentId: z.string() })).max(6),
  incomplete: z.boolean().optional(),
});
export type Answer = z.infer<typeof answerSchema>;
export type VerifiedClaim = {
  claim: Answer["claims"][number];
  citations: Answer["citations"];
};
export const configSchema = z.object({
  vectorTopK: z.number().int().min(1).max(100).default(40),
  lexicalTopK: z.number().int().min(1).max(100).default(40),
  fusionK: z.number().min(1).default(60),
  rerankerTopK: z.number().int().min(1).max(40).default(20),
  diverseReranking: z.boolean().default(false),
  rerankerChunksPerDocument: z.number().int().min(1).max(12).default(4),
  finalEvidenceCount: z.number().int().min(1).max(12).default(8),
  evidenceChunksPerDocument: z.number().int().min(1).max(12).default(2),
  chunkSize: z.number().int().min(200).max(1200).default(600),
  chunkOverlap: z.number().int().min(0).max(200).default(70),
  embeddingModel: z.string().default("google/gemini-embedding-001"),
  embeddingDimensions: z.literal(1536).default(1536),
  reasoningEffort: z
    .enum(["none", "minimal", "low", "medium", "high", "xhigh"])
    .default("medium"),
  generationModel: z.string().default("openai/gpt-6-luna"),
  rerankerModel: z.string().default("openai/gpt-6-luna"),
  judgeModel: z.string().default("openai/gpt-6-luna"),
  promptVersion: z.enum(["evidence-v1", "evidence-v2"]).default("evidence-v2"),
  fusionAlgorithm: z.enum(["rrf", "weighted-rrf"]).default("rrf"),
  lexicalWeight: z.number().min(0).max(2).default(1),
  vectorWeight: z.number().min(0).max(2).default(1),
  ftsTitleWeight: z.number().min(0).max(1).default(1),
  authorityWeight: z.number().min(0).max(1).default(0.15),
  freshnessWeight: z.number().min(0).max(1).default(0.08),
  minRerankRelevance: z.number().min(0).max(1).default(0.6),
});
export type SearchConfig = z.infer<typeof configSchema>;
export const defaultConfig = configSchema.parse({});
export type Stage =
  "understandQuery" | "retrieval" | "rerank" | "generation" | "evaluation";
export type SearchResult = {
  id: string;
  traceId: string;
  query: string;
  resolvedQuery?: string;
  understanding: QueryUnderstanding;
  evidence: Evidence[];
  answer: Answer;
  mode: "live" | "preview";
  latencyMs: number;
  tokens: number;
  costUsd: number | null;
  usage?: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number | null;
    latencyMs: number;
  }[];
  config: SearchConfig;
};
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function compatibleJurisdiction(
  document: string,
  target?: string,
): boolean {
  if (!target) return document === "ES";
  return document === target || target.startsWith(document + "-");
}
export const abstain = (
  reason = "No tengo evidencia oficial suficiente para responder con seguridad. Concreta el trámite o consulta el organismo responsable.",
): Answer => ({
  status: "insufficient_evidence",
  answer: reason,
  claims: [],
  citations: [],
  relatedOfficialLinks: [],
});
/** Compare literal text without treating Markdown markup or NBSP as factual differences. */
export function evidenceText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^\n]*?\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
export function quoteSupported(content: string, quote: string): boolean {
  const text = evidenceText(quote);
  return text.length >= 8 && evidenceText(content).includes(text);
}

/** Stable identity for the index-affecting knobs, shared by ingestion and evals. */
export function indexConfigIdentity(config: SearchConfig): string {
  return JSON.stringify({
    size: config.chunkSize,
    overlap: config.chunkOverlap,
    model: config.embeddingModel,
    dimensions: config.embeddingDimensions,
  });
}
