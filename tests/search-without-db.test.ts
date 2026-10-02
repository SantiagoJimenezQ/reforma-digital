import { afterEach, describe, expect, it } from "vitest";
import { previewCorpus } from "../packages/ai/src/preview-corpus";
import { searchMode } from "../apps/web/lib/search-mode";

const previous = {
  SEARCH_MODE: process.env.SEARCH_MODE,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
};

afterEach(() => {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("search without a hosted database", () => {
  it("treats SEARCH_MODE=live as live without asking for Postgres", () => {
    process.env.SEARCH_MODE = "live";
    expect(searchMode()).toBe("live");
  });

  it("uses web search when only an OpenRouter key is configured", () => {
    delete process.env.SEARCH_MODE;
    process.env.OPENROUTER_API_KEY = "test-key";
    expect(searchMode()).toBe("live");
  });
  it("preserves an explicit offline preview even with a key", () => {
    process.env.SEARCH_MODE = "preview";
    process.env.OPENROUTER_API_KEY = "test-key";
    expect(searchMode()).toBe("preview");
  });
  it("keeps official corpus excerpts available without Postgres", () => {
    expect(
      previewCorpus.some((item) => /vida laboral/i.test(item.content)),
    ).toBe(true);
  });
});
