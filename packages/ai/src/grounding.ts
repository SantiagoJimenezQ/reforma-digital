import {
  answerSchema,
  abstain,
  quoteSupported,
  compatibleJurisdiction,
  type Answer,
  type Evidence,
  type QueryUnderstanding,
} from "@reforma-digital/core";
import { approvedSource } from "@reforma-digital/government";
export function validateAnswer(
  raw: unknown,
  evidence: Evidence[],
  q: QueryUnderstanding,
): Answer {
  const parsed = answerSchema.safeParse(raw);
  if (!parsed.success)
    return abstain(
      "No he podido verificar el formato de la respuesta. Prueba a concretar la consulta.",
    );
  const a = parsed.data;
  const ids = new Set(a.claims.map((c) => c.id));
  if (ids.size !== a.claims.length) return abstain();
  if (a.status !== "answered")
    return {
      ...abstain(
        a.status === "needs_clarification"
          ? "¿Puedes concretar el trámite, tu situación y, si corresponde, el municipio o comunidad autónoma?"
          : undefined,
      ),
      status: a.status,
    };
  if (!a.claims.length || !a.citations.length) return abstain();
  if (
    [a.answer, ...a.claims.map((c) => c.text)].some((t) =>
      /https?:|www\.|<\/?\w|\]\(/i.test(t),
    )
  )
    return abstain();
  for (const c of a.citations) {
    const e = evidence.find(
      (e) => e.chunkId === c.chunkId && e.documentId === c.documentId,
    );
    if (
      !ids.has(c.claimId) ||
      !e ||
      !e.available ||
      !approvedSource(e.canonicalUrl, e.sourceId) ||
      !compatibleJurisdiction(e.jurisdiction, q.jurisdiction) ||
      !quoteSupported(e.content, c.quote)
    )
      return abstain(
        "La respuesta no ha superado la verificación de sus referencias. No tengo evidencia suficiente para publicarla.",
      );
  }
  if (a.claims.some((c) => !a.citations.some((ref) => ref.claimId === c.id)))
    return abstain();
  if (
    a.relatedOfficialLinks.some(
      (l) =>
        !evidence.some(
          (e) =>
            e.documentId === l.documentId &&
            approvedSource(e.canonicalUrl, e.sourceId),
        ),
    )
  )
    return abstain();
  // Facts are only rendered from cited claims; free-form model prose cannot smuggle uncited facts.
  return { ...a, answer: "Esto es lo que indican las fuentes oficiales:" };
}
export function resolveCitationText(
  refs: Omit<Answer["citations"][number], "quote">[],
  evidence: Evidence[],
): Answer["citations"] {
  return refs.map((ref) => ({
    ...ref,
    quote:
      evidence.find(
        (e) => e.documentId === ref.documentId && e.chunkId === ref.chunkId,
      )?.content ?? "",
  }));
}
