import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db, feedback, searches, eq, closeDb } from "@reforma-digital/db";
import { repoRoot } from "./index";
try {
  const rows = await db()
    .select({ feedback, search: searches })
    .from(feedback)
    .innerJoin(searches, eq(feedback.searchId, searches.id));
  const candidates = rows
    .filter((r) => r.feedback.rating === -1 && !r.feedback.reviewedAt)
    .map((r) => ({
      id: "production-" + r.feedback.id,
      query: r.search.result.query,
      metadata: { category: "unanswerable", difficulty: "hard" },
      critical: false,
      golden: false,
      review: {
        status: "pending",
        reviewer: null,
        reviewedAt: null,
        evidenceNotes: `Feedback: ${r.feedback.reason ?? ""}. Review trace ${r.search.result.traceId}; decide expected.shouldAnswer and evidence manually.`,
      },
      expected: {
        relevantSourceIds: [],
        relevantDocumentIds: [],
        relevanceGrades: {},
        mustContainFacts: [],
        mustNotContainFacts: [],
        shouldAnswer: false,
      },
      context: {
        traceId: r.search.result.traceId,
        comment: r.feedback.comment,
        evidence: r.search.result.evidence,
        answer: r.search.result.answer,
      },
    }));
  const dir = path.join(repoRoot, "artifacts/feedback");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "review-queue.json"),
    JSON.stringify(candidates, null, 2),
  );
  console.log(
    `${candidates.length} candidatos exportados. No se han modificado expectativas ni el golden set.`,
  );
} finally {
  await closeDb();
}
