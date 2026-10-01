import { describe, it, expect, vi } from "vitest";
import {
  Firecrawl,
  normalizeSourceMarkdown,
} from "../packages/crawler/src/index";
import { sourceById } from "../packages/government/src/index";
import { loadDataset } from "../packages/evals/src/index";
import { understandQuery } from "../packages/retrieval/src/index";

describe("PAG company formation regression", () => {
  it("extracts the explicit main region instead of the empty heuristic table", async () => {
    const source = sourceById("administracion");
    const url = source.crawlConfig.seeds.find((url) => url.endsWith("/crear"))!;
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            markdown:
              "# Crear una empresa\n\nUna SL puede constituirse mediante CIRCE y el DUE.",
            metadata: { statusCode: 200, url, title: "Crear una empresa" },
          },
        }),
        { status: 200 },
      ),
    );
    try {
      const result = await new Firecrawl("test-key").scrape(url, source);
      const body = JSON.parse(String(fetch.mock.calls[0]![1]!.body));
      expect(body).toMatchObject({
        onlyMainContent: false,
        includeTags: ["main"],
      });
      expect(result.markdown).toContain("CIRCE");
      expect(result.canonicalUrl).toBe(url);
    } finally {
      fetch.mockRestore();
    }
  });
  it("removes the PAG sidebar while retaining the complete article", () => {
    expect(
      normalizeSourceMarkdown(
        "Menú lateral\n\n# Crear una empresa\n\n## CIRCE\n\nDocumento Único Electrónico",
        "administracion",
      ),
    ).toBe("# Crear una empresa\n\n## CIRCE\n\nDocumento Único Electrónico");
  });
  it("keeps the real failure as a critical regression without approving a golden", async () => {
    const data = await loadDataset("regressions");
    const reported = data.cases.find(
      (c) => c.query === "como me monto una SL",
    )!;
    expect(reported.critical).toBe(true);
    expect(reported.expected.relevantDocumentIds).toHaveLength(1);
    expect(reported.expected.shouldAnswer).toBe(true);
    expect(reported.review.status).toBe("pending");
    expect(understandQuery(reported.query).clarification).toBeUndefined();
  });
});
