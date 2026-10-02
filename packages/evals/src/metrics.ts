import {
  compatibleJurisdiction,
  normalizeText,
  quoteSupported,
  type Evidence,
  type SearchResult,
} from '@gov/core';
import { approvedSource } from '@gov/government';
import type { EvalCase } from './schema';
export type Metrics = Record<string, number | null>;
export const mean = (values: (number | null | undefined)[]) => {
  const v = values.filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
export function retrievalMetrics(c: EvalCase, evidence: Evidence[]): Metrics {
  const docs = [...new Map(evidence.map((e) => [e.documentId, e])).values()];
  const gold = c.expected.relevantDocumentIds;
  const hasGold = gold.length > 0;
  const rank = docs.findIndex((e) => gold.includes(e.documentId));
  const top = docs[0];
  const grades = c.expected.relevanceGrades;
  const dcg = (g: number[]) => g.reduce((s, x, i) => s + (2 ** x - 1) / Math.log2(i + 2), 0);
  const ideal = dcg(
    Object.values(grades)
      .sort((a, b) => b - a)
      .slice(0, 10),
  );
  const result: Metrics = {
    mrr: hasGold ? (rank < 0 ? 0 : 1 / (rank + 1)) : null,
    ndcg10: ideal ? dcg(docs.slice(0, 10).map((d) => grades[d.documentId] ?? 0)) / ideal : null,
    organizationAccuracy: c.expected.relevantSourceIds.length
      ? top && c.expected.relevantSourceIds.includes(top.sourceId)
        ? 1
        : 0
      : null,
    jurisdictionAccuracy: c.expected.expectedJurisdiction
      ? top && compatibleJurisdiction(top.jurisdiction, c.expected.expectedJurisdiction)
        ? 1
        : 0
      : null,
    wrongJurisdiction: docs.length
      ? docs
          .slice(0, 10)
          .filter(
            (e) =>
              !compatibleJurisdiction(e.jurisdiction, c.expected.expectedJurisdiction || undefined),
          ).length / Math.min(docs.length, 10)
      : 0,
    authority: top ? top.authorityScore / 100 : null,
  };
  for (const k of [1, 3, 5, 10])
    result[`recall${k}`] = hasGold
      ? docs.slice(0, k).some((e) => gold.includes(e.documentId))
        ? 1
        : 0
      : null;
  return result;
}
export function deterministicAnswerMetrics(c: EvalCase, r: SearchResult): Metrics {
  const a = r.answer;
  const abstained = a.status !== 'answered';
  const citations = a.citations;
  const valid = citations.filter((ref) => {
    const e = r.evidence.find((e) => e.documentId === ref.documentId && e.chunkId === ref.chunkId);
    return (
      !!e &&
      !!approvedSource(e.canonicalUrl, e.sourceId) &&
      quoteSupported(e.content, ref.quote) &&
      a.claims.some((cl) => cl.id === ref.claimId)
    );
  });
  const full = normalizeText([a.answer, ...a.claims.map((cl) => cl.text)].join(' '));
  return {
    citationIntegrity: citations.length
      ? valid.length / citations.length
      : c.expected.shouldAnswer
        ? 0
        : null,
    citationCoverage: a.claims.length
      ? a.claims.filter((cl) => valid.some((ref) => ref.claimId === cl.id)).length / a.claims.length
      : c.expected.shouldAnswer
        ? 0
        : null,
    abstentionAccuracy: Number(abstained === !c.expected.shouldAnswer),
    forbiddenFacts: c.expected.mustNotContainFacts.length
      ? Number(c.expected.mustNotContainFacts.every((f) => !full.includes(normalizeText(f))))
      : null,
    officialUrls: r.evidence.length
      ? Number(r.evidence.every((e) => approvedSource(e.canonicalUrl, e.sourceId)))
      : null,
    faithfulness: null,
    citationPrecision: null,
    completeness: null,
    hallucinationFree: null,
    answerJurisdiction: null,
    clarity: null,
  };
}
export type CaseResult = {
  case: EvalCase;
  result: SearchResult | null;
  metrics: Metrics;
  failures: string[];
  error?: string;
  judges?: Record<string, unknown>;
};
export function aggregate(rows: CaseResult[]): Metrics {
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r.metrics)))];
  const m: Metrics = Object.fromEntries(keys.map((k) => [k, mean(rows.map((r) => r.metrics[k]))]));
  const answering = rows.filter(
    (r) => r.result?.mode === 'live' && r.metrics.abstentionAccuracy !== undefined,
  );
  const tp = answering.filter(
    (r) => !r.case.expected.shouldAnswer && r.result!.answer.status !== 'answered',
  ).length;
  const fp = answering.filter(
    (r) => r.case.expected.shouldAnswer && r.result!.answer.status !== 'answered',
  ).length;
  const fn = answering.filter(
    (r) => !r.case.expected.shouldAnswer && r.result!.answer.status === 'answered',
  ).length;
  m.abstentionPrecision = tp + fp ? tp / (tp + fp) : null;
  m.abstentionRecall = tp + fn ? tp / (tp + fn) : null;
  const times = rows.flatMap((r) => (r.result ? [r.result.latencyMs] : [])).sort((a, b) => a - b);
  m.p50Latency = times.length ? times[Math.ceil(times.length * 0.5) - 1]! : null;
  m.p95Latency = times.length ? times[Math.ceil(times.length * 0.95) - 1]! : null;
  m.costUsd = mean(rows.map((r) => r.result?.costUsd));
  m.tokens = mean(rows.map((r) => r.result?.tokens));
  m.errorRate = rows.length ? rows.filter((r) => r.error).length / rows.length : 0;
  m.documentGoldCoverage = rows.length
    ? rows.filter((r) => r.case.expected.relevantDocumentIds.length).length / rows.length
    : 0;
  return m;
}
