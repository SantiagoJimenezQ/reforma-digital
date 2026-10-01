import { describe, it, expect } from "vitest";
import {
  defaultConfig,
  quoteSupported,
  compatibleJurisdiction,
  type Answer,
  type Evidence,
} from "../packages/core/src/index";
import {
  approvedSource,
  canonicalize,
  documentJurisdiction,
  sourceById,
  eligibleDocument,
} from "../packages/government/src/index";
import { chunkMarkdown, classifyUrl } from "../packages/crawler/src/index";
import {
  understandQuery,
  fuseCandidates,
  selectRerankCandidates,
} from "../packages/retrieval/src/index";
import { validateAnswer, resolveCitationText } from "../packages/ai/src/index";
const evidence: Evidence = {
  chunkId: "c1",
  documentId: "d1",
  sourceId: "seg-social",
  canonicalUrl: "https://portal.seg-social.gob.es/informe",
  title: "Vida laboral",
  heading: "Descarga",
  content: "Puedes descargar el informe en PDF.",
  organization: "Seguridad Social",
  jurisdiction: "ES",
  authorityScore: 100,
  crawledAt: "2026-09-30T00:00:00Z",
  sourceUpdatedAt: null,
  score: 1,
  available: true,
};
const answer: Answer = {
  status: "answered",
  answer: "Introducción",
  claims: [
    { id: "a", text: "Puedes descargar el informe en PDF.", kind: "step" },
  ],
  citations: [
    { claimId: "a", documentId: "d1", chunkId: "c1", quote: evidence.content },
  ],
  relatedOfficialLinks: [{ documentId: "d1" }],
};
describe("Official registry boundary", () => {
  it.each([
    "https://portal.seg-social.gob.es.evil.com/a",
    "http://portal.seg-social.gob.es/a",
    "https://portal.seg-social.gob.es@evil.com",
    "https://user@portal.seg-social.gob.es/a",
    "https://portal.seg-social.gob.es:8080/a",
    "https://localhost/a",
    "https://127.0.0.1/a",
    "https://wikipedia.org/a",
  ])("rejects %s", (url) => expect(approvedSource(url)).toBeUndefined());
  it("requires matching source", () =>
    expect(approvedSource(evidence.canonicalUrl, "dgt")).toBeUndefined());
  it("preserves meaningful query parameters", () =>
    expect(
      canonicalize(
        "https://sede.madrid.es/a?vgnextoid=123&utm_source=foo#print",
      ),
    ).toBe("https://sede.madrid.es/a?vgnextoid=123"));
});
describe("Jurisdiction precedes similarity", () => {
  it.each([
    ["ES", "ES-MD-MADRID", true],
    ["ES-MD", "ES-MD-MADRID", true],
    ["ES-MD-MADRID", "ES-MD", false],
    ["ES-MD-MADRID", "ES-CT-BARCELONA", false],
    ["ES-MD-MADRID", undefined, false],
    ["ES", undefined, true],
  ])("%s / %s", (doc, target, expected) =>
    expect(compatibleJurisdiction(doc, target as string | undefined)).toBe(
      expected,
    ),
  );
  it("does not invent location", () =>
    expect(
      understandQuery("¿Dónde saco mi vida laboral?").jurisdiction,
    ).toBeUndefined());
  it("asks for a municipality", () =>
    expect(understandQuery("¿Cómo me empadrono?").clarification).toBeTruthy());
  it("does not confuse Alcobendas with Madrid capital", () =>
    expect(understandQuery("Padrón en Alcobendas, Madrid").jurisdiction).toBe(
      "ES-MD-ALCOBENDAS",
    ));
  it("excludes wrong jurisdiction despite highest retrieval score", () => {
    const wrong = {
      ...evidence,
      chunkId: "wrong",
      jurisdiction: "ES-CT-BARCELONA",
      score: 99999,
    };
    const q = understandQuery("vida laboral Madrid");
    expect(
      fuseCandidates(
        { lexical: [wrong, evidence], semantic: [wrong] },
        q,
        defaultConfig,
      ).map((e) => e.chunkId),
    ).toEqual(["c1"]);
  });
  it("excludes unavailable and expired documents", () =>
    expect(
      fuseCandidates(
        {
          lexical: [
            { ...evidence, available: false },
            { ...evidence, chunkId: "expired", validUntil: "2020-01-01" },
          ],
          semantic: [],
        },
        understandQuery("vida laboral"),
        defaultConfig,
      ),
    ).toEqual([]));
  it("fuses by ranks rather than incompatible raw scores", () => {
    const b = { ...evidence, chunkId: "c2", score: 100000 };
    const result = fuseCandidates(
      { lexical: [evidence, b], semantic: [b, evidence] },
      understandQuery("vida laboral"),
      defaultConfig,
    );
    expect(result[0]!.score).toBeCloseTo(result[1]!.score);
  });
});
describe("Reranker document diversity", () => {
  it("keeps both responsible publishers when one long document dominates", () => {
    const dominant = Array.from({ length: 25 }, (_, i) => ({
      ...evidence,
      chunkId: `social-${i}`,
    }));
    const tax = {
      ...evidence,
      sourceId: "aeat",
      documentId: "tax",
      chunkId: "tax-036",
    };
    const result = selectRerankCandidates(
      [...dominant, tax],
      understandQuery("¿Cómo me hago autónomo?"),
      { ...defaultConfig, diverseReranking: true },
    );
    expect(result.some((e) => e.chunkId === tax.chunkId)).toBe(true);
    expect(
      result.filter((e) => e.documentId === evidence.documentId),
    ).toHaveLength(4);
    expect(result.length).toBeLessThanOrEqual(defaultConfig.rerankerTopK);
  });
  it("respects the configured window and adds no missing publisher evidence", () => {
    const candidates = [
      evidence,
      { ...evidence, chunkId: "second", documentId: "second-doc" },
    ];
    expect(
      selectRerankCandidates(candidates, understandQuery("alta autónomo"), {
        ...defaultConfig,
        diverseReranking: true,
        rerankerTopK: 1,
      }),
    ).toEqual([evidence]);
  });
  it("keeps the established selection unless the experiment is enabled", () => {
    const candidates = Array.from({ length: 25 }, (_, i) => ({
      ...evidence,
      chunkId: `chunk-${i}`,
    }));
    expect(
      selectRerankCandidates(
        candidates,
        understandQuery("autónomo"),
        defaultConfig,
      ),
    ).toEqual(candidates.slice(0, 20));
    expect(understandQuery("autónomo").keywords).not.toContain("036");
    expect(
      understandQuery("autónomo", { ...defaultConfig, diverseReranking: true })
        .keywords,
    ).toContain("036");
  });
});
describe("Structure-aware chunks", () => {
  it("retains parent headings and list blocks", () => {
    const chunks = chunkMarkdown(
      "# Solicitud\n\n## Documentos\n\n- DNI\n- Formulario\n\n## Presentación\n\nEn la sede.",
      "Trámite",
      400,
      50,
    );
    expect(chunks[0]!.heading).toBe("Trámite > Solicitud > Documentos");
    expect(chunks[0]!.content).toContain("- DNI\n- Formulario");
    expect(chunks[1]!.heading).toBe("Trámite > Solicitud > Presentación");
  });
  it("bounds giant paragraphs without dropping content", () => {
    const text = "requisito ".repeat(1600);
    const chunks = chunkMarkdown(text, "Test", 400, 0);
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.every((c) => c.tokenCount <= 405)).toBe(true);
    expect(
      chunks
        .map((c) => c.content)
        .join("")
        .replace(/\s/g, ""),
    ).toBe(text.replace(/\s/g, ""));
  });
  it("uses metadata for classification", () => {
    expect(
      classifyUrl({
        url: "https://sede.madrid.es/abc",
        title: "Galería de prensa",
      }),
    ).toBe(-1);
    expect(
      classifyUrl({
        url: "https://sede.madrid.es/abc",
        title: "Documentación del trámite",
      }),
    ).toBe(2);
  });
});
describe("Citation integrity, fail closed", () => {
  const q = understandQuery("¿Cómo obtengo mi vida laboral?");
  it("accepts an existing cited fragment", () =>
    expect(validateAnswer(answer, [evidence], q).status).toBe("answered"));
  it("strips uncited prose", () =>
    expect(
      validateAnswer(
        { ...answer, answer: "Debes pagar 999 euros." },
        [evidence],
        q,
      ).answer,
    ).not.toContain("999"));
  it.each([
    { ...answer, citations: [{ ...answer.citations[0]!, chunkId: "forged" }] },
    {
      ...answer,
      citations: [
        { ...answer.citations[0]!, quote: "El trámite cuesta 999 euros." },
      ],
    },
    {
      ...answer,
      claims: [
        ...answer.claims,
        { id: "b", text: "Cuesta 999 euros.", kind: "cost" },
      ],
    },
    { ...answer, relatedOfficialLinks: [{ documentId: "forged" }] },
    {
      ...answer,
      claims: [{ ...answer.claims[0]!, text: "Entra en https://evil.com" }],
    },
    { ...answer, claims: [answer.claims[0]!, answer.claims[0]!] },
  ])("rejects invalid references", (raw) =>
    expect(validateAnswer(raw, [evidence], q).status).toBe(
      "insufficient_evidence",
    ),
  );
  it("rejects wrong jurisdiction evidence", () =>
    expect(
      validateAnswer(answer, [{ ...evidence, jurisdiction: "ES-MD-MADRID" }], q)
        .status,
    ).toBe("insufficient_evidence"));
  it("does not expose facts in a clarification", () =>
    expect(
      validateAnswer(
        { ...answer, status: "needs_clarification" },
        [evidence],
        q,
      ).claims,
    ).toEqual([]));
});

describe("Real ingestion regressions", () => {
  it("normalizes presentation without losing factual quote integrity", () => {
    expect(
      quoteSupported(
        "Descarga el **informe** en [PDF](https://portal.seg-social.gob.es/pdf).",
        "Descarga el informe en PDF.",
      ),
    ).toBe(true);
    expect(
      quoteSupported(
        "El importe es de 15 euros.",
        "El importe es de 50 euros.",
      ),
    ).toBe(false);
  });
  it("national publishers do not turn regional rules into national rules", () =>
    expect(
      documentJurisdiction(
        sourceById("aeat"),
        "Deducciones Asturias",
        "https://sede.agenciatributaria.gob.es/Sede/asturias",
      ),
    ).toBe("ES-AS"));
  it("quarantines irrelevant pages but permits canonical health service redirects", () => {
    expect(
      eligibleDocument(
        sourceById("comunidad-madrid"),
        "Tarjeta Sanitaria",
        "https://www.comunidad.madrid/salud/tarjeta-sanitaria",
      ),
    ).toBe(true);
    expect(
      eligibleDocument(
        sourceById("comunidad-madrid"),
        "Noticia",
        "https://www.comunidad.madrid/agenda-gobierno/2026/acto",
      ),
    ).toBe(false);
  });
  it("recognizes a precise fiscal query without asking for the procedure again", () =>
    expect(
      understandQuery("Cómo cambio mi domicilio fiscal").clarification,
    ).toBeUndefined());
});

describe("Query understanding failures found by full-v1.1", () => {
  it.each([
    "como me monto una SL",
    "Cómo constituyo una S.L.",
    "Quiero abrir una sociedad limitada",
  ])("recognizes company formation: %s", (query) => {
    const q = understandQuery(query);
    expect(q.clarification).toBeUndefined();
    expect(q.keywords).toContain("limitada");
    expect(q.likelyOrganizations).toContain("administracion");
    expect(q.jurisdiction).toBeUndefined();
  });
  it.each([
    "Cómo registro una asociación",
    "Cómo obtengo una licencia de pesca en Galicia",
    "Necesito un certificado de nacimiento",
  ])("searches unfamiliar but specific subjects: %s", (query) => {
    expect(understandQuery(query).clarification).toBeUndefined();
  });
  it.each([
    "Quiero pedir una ayuda",
    "Quiero renovar mis papeles",
    "Necesito un certificado",
    "¿Cuándo acaba el plazo?",
    "Necesito darme de alta",
  ])("still asks for a missing subject: %s", (query) => {
    expect(understandQuery(query).clarification).toBeTruthy();
  });
  it.each([
    "Cómo consulto el informe de un vehículo",
    "Cómo consulto mis datos fiscales",
    "Cómo me inscribo como demandante de empleo en Madrid",
  ])("understands %s", (q) =>
    expect(understandQuery(q).clarification).toBeUndefined(),
  );
  it("does not select a negated destination", () =>
    expect(
      understandQuery("Cómo inscribo mi demanda en Madrid, no en Andalucía")
        .jurisdiction,
    ).toBe("ES-MD-MADRID"));
  it("resolves explicit destination after an origin", () =>
    expect(
      understandQuery(
        "Puedo usar el padrón de Barcelona para darme de alta en Madrid",
      ).jurisdiction,
    ).toBe("ES-MD-MADRID"));
  it("uses the target tax year in a comparison", () =>
    expect(
      understandQuery(
        "Puedo usar el plazo de renta 2024 para presentar la renta de 2025",
      ).requestedYear,
    ).toBe(2025));
  it("does not retrieve municipal rules as national evidence", () =>
    expect(
      understandQuery("Trata el padrón de Madrid como válido para toda España")
        .jurisdiction,
    ).toBe("ES"));
});

describe("Server-resolved citation excerpts", () => {
  it("uses the original stored fragment, never a model rewrite", () => {
    expect(
      resolveCitationText(
        [{ claimId: "a", documentId: "d1", chunkId: "c1" }],
        [evidence],
      )[0]!.quote,
    ).toBe(evidence.content);
  });
  it("leaves invented IDs unresolvable so validation fails closed", () => {
    const refs = resolveCitationText(
      [{ claimId: "a", documentId: "d1", chunkId: "forged" }],
      [evidence],
    );
    expect(
      validateAnswer(
        { ...answer, citations: refs },
        [evidence],
        understandQuery("vida laboral"),
      ).status,
    ).toBe("insufficient_evidence");
  });
  it("cannot smuggle uncited requirements through abstention prose", () => {
    const result = validateAnswer(
      {
        ...answer,
        status: "insufficient_evidence",
        answer: "Debes pagar 999 euros.",
      },
      [evidence],
      understandQuery("vida laboral"),
    );
    expect(result.answer).not.toContain("999");
    expect(result.claims).toHaveLength(0);
  });
});

describe("Personal outcome requests", () => {
  it("does not substitute general requirements for a personal approval prediction", () =>
    expect(
      understandQuery("Me aprobarán mi beca personalmente").clarification,
    ).toContain("No puedo"));
  it("recognizes an explicit SEPE certificate request", () =>
    expect(
      understandQuery("Cómo obtengo un certificado de prestaciones del SEPE")
        .clarification,
    ).toBeUndefined());
});
