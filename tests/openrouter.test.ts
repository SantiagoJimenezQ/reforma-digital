import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultConfig } from "../packages/core/src/index";
import { languageModel, embeddingModel } from "../packages/ai/src/models";
import {
  recordUsage,
  usageContext,
  usageSummary,
} from "../packages/ai/src/usage";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("OpenRouter transport", () => {
  it("sends GPT-6 Luna with medium reasoning to OpenRouter", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-only-key");
    let request: Record<string, unknown> = {};
    let url = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input, init) => {
        url = String(input);
        request = JSON.parse(init.body);
        return Response.json({
          id: "test",
          model: defaultConfig.generationModel,
          created: 0,
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "ok" },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 2,
            completion_tokens: 1,
            total_tokens: 3,
            cost: 0.0001,
          },
        });
      }),
    );
    await languageModel(defaultConfig.generationModel).doGenerate({
      prompt: [{ role: "user", content: [{ type: "text", text: "test" }] }],
      maxOutputTokens: 20,
    });
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(request.model).toBe("openai/gpt-6-luna");
    expect(request.reasoning).toEqual({ effort: "medium", exclude: true });
    expect(request.provider).toEqual({ require_parameters: true });
  });
  it.each([
    ["query", "search_query"],
    ["document", "search_document"],
  ] as const)(
    "preserves dimensions and the %s embedding task",
    async (kind, inputType) => {
      vi.stubEnv("OPENROUTER_API_KEY", "test-only-key");
      let request: Record<string, unknown> = {};
      vi.stubGlobal(
        "fetch",
        vi.fn(async (_input, init) => {
          request = JSON.parse(init.body);
          return Response.json({
            object: "list",
            data: [{ object: "embedding", index: 0, embedding: [1, 2, 3] }],
            model: defaultConfig.embeddingModel,
            usage: { prompt_tokens: 1, total_tokens: 1 },
          });
        }),
      );
      await embeddingModel(defaultConfig, kind).doEmbed({ values: ["test"] });
      expect(request).toMatchObject({
        model: "google/gemini-embedding-001",
        dimensions: 1536,
        input_type: inputType,
      });
    },
  );
});
describe("OpenRouter accounting", () => {
  it("records the real OpenRouter cost and never turns unknown cost into zero", () => {
    usageContext.run([], () => {
      recordUsage(
        "openai/gpt-6-luna",
        100,
        50,
        { openrouter: { usage: { cost: 0.003 } } },
        performance.now(),
      );
      expect(usageSummary()).toMatchObject({ tokens: 150, costUsd: 0.003 });
      recordUsage("openai/gpt-6-luna", 2, 1, {}, performance.now());
      expect(usageSummary().costUsd).toBeNull();
    });
  });
});
