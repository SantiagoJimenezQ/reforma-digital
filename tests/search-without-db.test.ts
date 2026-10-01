import { afterEach, describe, expect, it } from "vitest";
import {
  generationAvailable,
  selectOfficialSeeds,
} from "../packages/ai/src/official-retrieval";
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

  it("can generate when an API key exists", () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    expect(generationAvailable()).toBe(true);
  });

  it("keeps official corpus excerpts available without Postgres", () => {
    expect(previewCorpus.some((item) => /vida laboral/i.test(item.content))).toBe(
      true,
    );
  });

  it("selects Interior DNI seeds from the registry instead of a canned answer", () => {
    const seeds = selectOfficialSeeds({
      normalizedQuery: "dni consulta",
      intent: "procedure",
      likelyOrganizations: ["administracion", "interior"],
      keywords: ["dni", "consulta", "documento", "identidad", "cita"],
      temporal: false,
    });
    expect(seeds.length).toBeGreaterThan(0);
    expect(seeds.every((seed) => seed.url.startsWith("https://"))).toBe(true);
    expect(
      seeds.some((seed) => seed.sourceId === "interior" && /dni/i.test(seed.url)),
    ).toBe(true);
  });
});
