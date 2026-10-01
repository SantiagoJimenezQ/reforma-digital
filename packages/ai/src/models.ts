import { AsyncLocalStorage } from "node:async_hooks";
import { embed, embedMany, generateObject, streamText, Output } from "ai";
import { z } from "zod";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { defaultConfig } from "@gov/core";
import type { SearchConfig } from "@gov/core";
import { recordUsage } from "./usage";
import { startActiveObservation } from "@langfuse/tracing";
const signals = new AsyncLocalStorage<AbortSignal>();
export const withModelSignal = <T>(signal: AbortSignal, fn: () => Promise<T>) =>
  signals.run(signal, fn);
const deadline = (ms: number) => {
  const signal = signals.getStore();
  return signal
    ? AbortSignal.any([signal, AbortSignal.timeout(ms)])
    : AbortSignal.timeout(ms);
};
const openrouter = createOpenRouter();
export function languageModel(
  model: string,
  effort: SearchConfig["reasoningEffort"] = defaultConfig.reasoningEffort,
) {
  return openrouter(model, {
    reasoning: { effort, exclude: true },
    usage: { include: true },
    provider: { require_parameters: true },
  });
}
export function embeddingModel(
  config: SearchConfig,
  kind: "query" | "document",
) {
  return openrouter.textEmbeddingModel(config.embeddingModel, {
    extraBody: {
      dimensions: config.embeddingDimensions,
      ...(config.embeddingModel.startsWith("google/")
        ? { input_type: kind === "query" ? "search_query" : "search_document" }
        : {}),
    },
  });
}
export async function embedding(text: string, config: SearchConfig) {
  const start = performance.now();
  const r = await embed({
    model: embeddingModel(config, "query"),
    value: text,
    abortSignal: deadline(30000),
    maxRetries: 2,
  });
  recordUsage(
    config.embeddingModel,
    r.usage.tokens,
    0,
    r.providerMetadata,
    start,
  );
  return r;
}
export async function embeddings(texts: string[], config: SearchConfig) {
  return embedMany({
    model: embeddingModel(config, "document"),
    values: texts,
    maxParallelCalls: 2,
    abortSignal: AbortSignal.timeout(120000),
    maxRetries: 2,
  });
}
export async function structured<S extends z.ZodType>(
  schema: S,
  system: string,
  input: unknown,
  model: string,
  reasoningEffort: SearchConfig["reasoningEffort"] = defaultConfig.reasoningEffort,
) {
  return startActiveObservation(
    "model.generate",
    async (span) => {
      const start = performance.now();
      span.update({
        input: { system, input },
        model,
        modelParameters: { reasoningEffort, provider: "openrouter" },
      });
      const r = await generateObject({
        model: languageModel(model, reasoningEffort),
        schema,
        system,
        prompt: JSON.stringify(input),
        ...(reasoningEffort === "none" ? { temperature: 0 } : {}),
        maxOutputTokens: 5000,
        abortSignal: deadline(60000),
        maxRetries: 1,
        experimental_telemetry: {
          isEnabled: !!process.env.LANGFUSE_SECRET_KEY,
        },
      });
      recordUsage(
        model,
        r.usage.inputTokens ?? 0,
        r.usage.outputTokens ?? 0,
        r.providerMetadata,
        start,
      );
      span.update({
        output: r.object,
        usageDetails: {
          input: r.usage.inputTokens ?? 0,
          output: r.usage.outputTokens ?? 0,
          total: r.usage.totalTokens ?? 0,
        },
      });
      return r;
    },
    { asType: "generation" },
  );
}

/** Complete schema-validated elements, delivered while the model is still producing its array. */
export async function streamElements<S extends z.ZodType>(
  schema: S,
  system: string,
  input: unknown,
  model: string,
  consume: (elements: AsyncIterable<z.infer<S>>) => Promise<void>,
  reasoningEffort: SearchConfig["reasoningEffort"] = defaultConfig.reasoningEffort,
) {
  return startActiveObservation(
    "model.stream",
    async (span) => {
      const start = performance.now();
      span.update({
        input: { system, input },
        model,
        modelParameters: { reasoningEffort, provider: "openrouter" },
      });
      const result = streamText({
        model: languageModel(model, reasoningEffort),
        output: Output.array({ element: schema }),
        system,
        prompt: JSON.stringify(input),
        ...(reasoningEffort === "none" ? { temperature: 0 } : {}),
        maxOutputTokens: 5000,
        abortSignal: deadline(60000),
        maxRetries: 1,
      });
      async function* validatedElements() {
        for await (const element of result.elementStream)
          yield schema.parse(element);
      }
      await consume(validatedElements());
      const usage = await result.totalUsage;
      recordUsage(
        model,
        usage.inputTokens ?? 0,
        usage.outputTokens ?? 0,
        await result.providerMetadata,
        start,
      );
      span.update({
        output: await result.output,
        usageDetails: {
          input: usage.inputTokens ?? 0,
          output: usage.outputTokens ?? 0,
          total: usage.totalTokens ?? 0,
        },
      });
      return usage;
    },
    { asType: "generation" },
  );
}
