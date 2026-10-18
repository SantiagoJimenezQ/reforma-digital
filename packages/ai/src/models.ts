import { AsyncLocalStorage } from 'node:async_hooks';
import { generateObject, generateText, Output } from 'ai';
import { z } from 'zod';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { defaultConfig } from '@reforma-digital/core';
import type { SearchConfig } from '@reforma-digital/core';
import { recordUsage } from './usage';
const signals = new AsyncLocalStorage<AbortSignal>();
export const withModelSignal = <T>(signal: AbortSignal, fn: () => Promise<T>) =>
  signals.run(signal, fn);
const deadline = (ms: number) => {
  const signal = signals.getStore();
  return signal ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : AbortSignal.timeout(ms);
};
/** NaN Builders (OpenAI-compatible). The key is read on every call so tests can stub it. */
export function languageModel(model: string) {
  return createOpenAICompatible({
    name: 'nan',
    baseURL: 'https://api.nan.builders/v1',
    apiKey: process.env.NAN_API_KEY,
    includeUsage: true,
    supportsStructuredOutputs: true,
  })(model);
}
export async function structured<S extends z.ZodType>(
  schema: S,
  system: string,
  input: unknown,
  model: string,
  reasoningEffort: SearchConfig['reasoningEffort'] = defaultConfig.reasoningEffort,
) {
  const start = performance.now();
  const r = await generateObject({
    model: languageModel(model),
    reasoning: reasoningEffort,
    schema,
    system,
    prompt: JSON.stringify(input),
    ...(reasoningEffort === 'none' ? { temperature: 0 } : {}),
    maxOutputTokens: 5000,
    abortSignal: deadline(60000),
    maxRetries: 1,
  });
  recordUsage(model, r.usage.inputTokens ?? 0, r.usage.outputTokens ?? 0, null, start);
  return r;
}

/**
 * Schema-validated elements of an array answer. Not streamed: NaN only enforces a JSON schema on
 * non-streamed requests.
 */
export async function generateElements<S extends z.ZodType>(
  schema: S,
  system: string,
  input: unknown,
  model: string,
  consume: (elements: AsyncIterable<z.infer<S>>) => Promise<void>,
  reasoningEffort: SearchConfig['reasoningEffort'] = defaultConfig.reasoningEffort,
) {
  const start = performance.now();
  const result = await generateText({
    model: languageModel(model),
    reasoning: reasoningEffort,
    output: Output.array({ element: schema }),
    system,
    prompt: JSON.stringify(input),
    ...(reasoningEffort === 'none' ? { temperature: 0 } : {}),
    maxOutputTokens: 5000,
    abortSignal: deadline(60000),
    maxRetries: 1,
  });
  async function* validatedElements() {
    for (const element of result.output) yield schema.parse(element);
  }
  await consume(validatedElements());
  recordUsage(
    model,
    result.totalUsage.inputTokens ?? 0,
    result.totalUsage.outputTokens ?? 0,
    null,
    start,
  );
  return result.totalUsage;
}

const exaResponse = z.object({
  results: z.array(
    z.object({
      url: z.string(),
      title: z.string().nullish(),
      highlights: z.array(z.string()).nullish(),
    }),
  ),
  costDollars: z.object({ total: z.number() }).partial().nullish(),
});

/** Excerpts of the pages that answer the query, from Exa, only on the allowed official domains. */
export async function searchWebSources(
  query: string,
  config: SearchConfig,
  allowedDomains: string[],
) {
  const key = process.env.EXA_API_KEY;
  if (!key) throw new Error('EXA_API_KEY is required for web search.');
  const start = performance.now();
  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'x-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      query,
      numResults: config.finalEvidenceCount,
      userLocation: 'ES',
      includeDomains: allowedDomains,
      contents: { highlights: { maxCharacters: 10000 } },
    }),
    signal: deadline(60000),
  });
  if (!res.ok) throw new Error(`Exa search failed with status ${res.status}.`);
  const r = exaResponse.parse(await res.json());
  recordUsage('exa', 0, 0, r.costDollars?.total ?? null, start);
  return r.results;
}
