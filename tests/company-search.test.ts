import { describe, it, expect } from "vitest";
import { loadDataset } from "../packages/evals/src/index";
import { understandQuery } from "../packages/retrieval/src/index";
describe("Company formation regression", () => {
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
