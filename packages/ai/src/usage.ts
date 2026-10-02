import { AsyncLocalStorage } from 'node:async_hooks';
export type ModelUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
  latencyMs: number;
};
export const usageContext = new AsyncLocalStorage<ModelUsage[]>();
export function recordUsage(
  model: string,
  inputTokens: number,
  outputTokens: number,
  metadata: unknown,
  started: number,
) {
  const m = metadata as
    | {
        openrouter?: { usage?: { cost?: unknown } };
        gateway?: { cost?: unknown };
      }
    | undefined;
  const raw = m?.openrouter?.usage?.cost ?? m?.gateway?.cost;
  const cost = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : NaN;
  usageContext.getStore()?.push({
    model,
    inputTokens,
    outputTokens,
    costUsd: Number.isFinite(cost) ? cost : null,
    latencyMs: Math.round(performance.now() - started),
  });
}
export function usageSummary() {
  const calls = usageContext.getStore() ?? [];
  return {
    tokens: calls.reduce((s, c) => s + c.inputTokens + c.outputTokens, 0),
    costUsd:
      calls.length && calls.every((c) => c.costUsd !== null)
        ? calls.reduce((s, c) => s + (c.costUsd ?? 0), 0)
        : calls.length
          ? null
          : 0,
    calls,
  };
}
