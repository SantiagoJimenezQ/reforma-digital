import {
  normalizeText,
  defaultConfig,
  compatibleJurisdiction,
  type Evidence,
  type QueryUnderstanding,
  type SearchConfig,
} from "@gov/core";
import { connection } from "@gov/db";
import { approvedSource, sources } from "@gov/government";
const stop = new Set(
  "como que donde cuando cuanto cuales puedo necesito para una uno unos las los del por con sin sobre quiero hacer tengo este esta hay me mi el la de en y a se es al un".split(
    " ",
  ),
);
// Only requests without a subject are ambiguous. An unknown subject must still
// reach retrieval: absence from an organization heuristic is not lack of intent.
const genericRequestWords = new Set([
  ...stop,
  ..."mis tus sus esto eso algo alguna algun algunos algun otro otra ayuda ayudas renovar renovacion papeles certificado certificados presentar solicitud solicitudes pago pagar ha llegado carta hago cambio cambiar datos corresponde prestacion prestaciones recurso recursos darme alta puede online cuesta tramite tramites acaba plazo cita documentacion x necesito necesita montar monto crear abrir constituir obtener sacar pedir solicitar hacer".split(
    " ",
  ),
]);
export function understandQuery(
  query: string,
  config: SearchConfig = defaultConfig,
): QueryUnderstanding {
  const q = normalizeText(query);
  const limitedCompany =
    /\b(?:sl|s l|srl|s r l|slu|s l u)\b|sociedad (?:de responsabilidad )?limitada/.test(
      q,
    );
  const locationText = q.replace(/\bno en [a-z ]+(?=,|$)/g, "");
  let jurisdiction: string | undefined;
  let location: string | undefined;
  const places: [RegExp, string, string][] = [
    [/alcala de henares/, "ES-MD-ALCALA", "Alcalá de Henares"],
    [/alcobendas/, "ES-MD-ALCOBENDAS", "Alcobendas"],
    [/barcelona|cataluna/, "ES-CT-BARCELONA", "Barcelona / Cataluña"],
    [/valencia/, "ES-VC-VALENCIA", "Valencia"],
    [/sevilla|andalucia/, "ES-AN-SEVILLA", "Sevilla / Andalucía"],
    [/bilbao|pais vasco/, "ES-PV-BILBAO", "Bilbao / País Vasco"],
    [/galicia|santiago/, "ES-GA", "Galicia"],
    [/canarias/, "ES-CN", "Canarias"],
    [/murcia/, "ES-MC", "Murcia"],
    [/comunidad de madrid/, "ES-MD", "Comunidad de Madrid"],
    [/madrid/, "ES-MD-MADRID", "Madrid"],
  ];
  const destination =
    locationText.match(
      /para (?:darme de alta|empadronarme) en ([a-z ]+)/,
    )?.[1] ?? locationText;
  for (const [re, j, l] of places)
    if (re.test(destination)) {
      jurisdiction = j;
      location = l;
      break;
    }
  if (/para toda espana/.test(q)) {
    jurisdiction = "ES";
    location = "España";
  }
  const likelyOrganizations: string[] = [];
  const mapping: [RegExp, string][] = [
    [/ley|boe|normativa|procedimiento administrativo/, "boe"],
    [/dni|pasaporte|fnmt|certificado electronico/, "administracion"],
    [
      /autonom|hacienda|renta|irpf|iva|036|030|censal|tributari|domicilio fiscal|datos fiscales/,
      "aeat",
    ],
    [/autonom|vida laboral|cotiza|seguridad social|nuss|naf/, "seg-social"],
    [/paro|desempleo|prestacion contributiva|subsidio|sepe/, "sepe"],
    [/beca|mec|estudi/, "educacion"],
    [/conduc|carnet|coche|vehiculo|multa|puntos/, "dgt"],
    [/padron|empadron|ibi|basura/, "ayuntamiento-madrid"],
    [
      /demanda(?:nte)? de empleo|inscrib.*demanda|renov.*demanda|sanitaria|familia numerosa|dependencia|discapacidad/,
      "comunidad-madrid",
    ],
  ];
  for (const [re, id] of mapping) if (re.test(q)) likelyOrganizations.push(id);
  if (limitedCompany) {
    for (const id of ["administracion", "aeat"])
      if (!likelyOrganizations.includes(id)) likelyOrganizations.push(id);
  }
  let clarification: string | undefined;
  const hasSubject =
    limitedCompany ||
    q
      .split(" ")
      .some((word) => word.length > 1 && !genericRequestWords.has(word));
  if (!hasSubject)
    clarification =
      "¿Qué trámite o ayuda necesitas? Dime su nombre y, si depende de dónde vives, tu municipio o comunidad autónoma.";
  if (/padron|empadron|ibi|basura/.test(q) && !jurisdiction)
    clarification =
      "¿En qué municipio quieres hacer el trámite? Los requisitos y el organismo dependen del ayuntamiento.";
  if (
    /demanda(?:nte)? de empleo|inscrib.*demanda|renov.*demanda|sanitaria|familia numerosa|dependencia|discapacidad/.test(
      q,
    ) &&
    !jurisdiction
  )
    clarification = "¿En qué comunidad autónoma necesitas hacer el trámite?";
  if (/me aprobaran|me concederan|mi expediente|citas libres/.test(q))
    clarification =
      "No puedo consultar expedientes personales, garantizar una concesión ni comprobar citas disponibles. Puedo ayudarte a encontrar los requisitos y canales oficiales del trámite.";
  const keywords = q.split(" ").filter((w) => w.length > 2 && !stop.has(w));
  if (limitedCompany)
    keywords.push("sociedad", "limitada", "constitución", "empresa");
  const expansions: [RegExp, string[]][] = [
    [/autonom/, ["alta", "trabajo", "autónomo"]],
    [/paro/, ["prestación", "desempleo"]],
    [/mec/, ["beca", "general"]],
    [/empadron/, ["padrón"]],
    [/carnet/, ["permiso", "conducir"]],
  ];
  for (const [re, words] of expansions) if (re.test(q)) keywords.push(...words);
  if (config.diverseReranking && /autonom/.test(q))
    keywords.push("censal", "036");
  const year =
    q.match(/para presentar la renta (?:de )?(20\d{2})/) ??
    q.match(/\b(20\d{2})\b/);
  return {
    normalizedQuery: q,
    intent: /document|requisit/.test(q)
      ? "requirements"
      : /cuanto|coste|cuesta|importe/.test(q)
        ? "cost"
        : /plazo|cuando/.test(q)
          ? "deadline"
          : "procedure",
    ...(location ? { location } : {}),
    ...(jurisdiction ? { jurisdiction } : {}),
    likelyOrganizations,
    keywords: [...new Set(keywords)],
    ...(clarification ? { clarification } : {}),
    temporal: /plazo|importe|cuesta|coste|renta|beca|cuota|202\d/.test(q),
    ...(year ? { requestedYear: Number(year[1]) } : {}),
  };
}
export type CandidateLists = { lexical: Evidence[]; semantic: Evidence[] };
function rowEvidence(r: Record<string, unknown>): Evidence {
  return {
    chunkId: String(r.chunk_id),
    documentId: String(r.document_id),
    sourceId: String(r.source_id),
    canonicalUrl: String(r.canonical_url),
    title: String(r.title),
    heading: String(r.heading),
    content: String(r.content),
    organization: String(r.organization),
    jurisdiction: String(r.jurisdiction),
    authorityScore: Number(r.authority_score),
    crawledAt: new Date(String(r.crawled_at)).toISOString(),
    sourceUpdatedAt: r.source_updated_at
      ? new Date(String(r.source_updated_at)).toISOString()
      : null,
    score: Number(r.score),
    available: true,
    applicabilityYear: r.applicability_year
      ? Number(r.applicability_year)
      : null,
    validUntil: r.valid_until
      ? new Date(String(r.valid_until)).toISOString()
      : null,
  };
}
export async function retrieveCandidates(
  q: QueryUnderstanding,
  vector: number[],
  config: SearchConfig,
  trace: <T>(name: string, fn: () => Promise<T>) => Promise<T> = (_, fn) =>
    fn(),
): Promise<CandidateLists> {
  if (
    vector.length !== config.embeddingDimensions ||
    vector.some((n) => !Number.isFinite(n))
  )
    throw new Error("Embedding inválido");
  const sql = connection();
  const jurisdiction = q.jurisdiction ?? "ES";
  const approved = sources.filter((s) => s.enabled).map((s) => s.id);
  const lexical = trace("lexical", async () => {
    const rows =
      await sql`SELECT c.id AS chunk_id,c.document_id,c.content,c.heading,d.source_id,d.canonical_url,d.title,d.organization,d.jurisdiction,d.authority_score,d.crawled_at,d.source_updated_at,d.valid_until,d.applicability_year,ts_rank_cd(ARRAY[0.1,0.2,0.4,${config.ftsTitleWeight}]::real[],c.search_vector,websearch_to_tsquery('spanish',${q.keywords.join(" OR ")})) AS score FROM chunks c JOIN documents d ON d.id=c.document_id JOIN sources s ON s.id=d.source_id WHERE d.indexable AND d.available AND s.enabled AND d.source_id=ANY(${approved}) AND d.embedding_model=${config.embeddingModel} AND (d.applicability_year IS NULL OR d.applicability_year=${q.requestedYear ?? new Date().getUTCFullYear() - 1} OR (${q.requestedYear ?? null}::integer IS NULL AND d.applicability_year=${new Date().getUTCFullYear()})) AND (d.valid_until IS NULL OR d.valid_until>now()) AND (${jurisdiction}=d.jurisdiction OR starts_with(${jurisdiction},d.jurisdiction||'-')) AND c.search_vector @@ websearch_to_tsquery('spanish',${q.keywords.join(" OR ")}) ORDER BY score DESC,c.id LIMIT ${config.lexicalTopK}`;
    return rows
      .map(rowEvidence)
      .filter((e) => approvedSource(e.canonicalUrl, e.sourceId));
  });
  const semantic = trace("semantic", async () => {
    const rows =
      await sql`SELECT c.id AS chunk_id,c.document_id,c.content,c.heading,d.source_id,d.canonical_url,d.title,d.organization,d.jurisdiction,d.authority_score,d.crawled_at,d.source_updated_at,d.valid_until,d.applicability_year,1-(c.embedding <=> ${JSON.stringify(vector)}::vector) AS score FROM chunks c JOIN documents d ON d.id=c.document_id JOIN sources s ON s.id=d.source_id WHERE c.embedding IS NOT NULL AND d.indexable AND d.available AND s.enabled AND d.source_id=ANY(${approved}) AND d.embedding_model=${config.embeddingModel} AND (d.applicability_year IS NULL OR d.applicability_year=${q.requestedYear ?? new Date().getUTCFullYear() - 1} OR (${q.requestedYear ?? null}::integer IS NULL AND d.applicability_year=${new Date().getUTCFullYear()})) AND (d.valid_until IS NULL OR d.valid_until>now()) AND (${jurisdiction}=d.jurisdiction OR starts_with(${jurisdiction},d.jurisdiction||'-')) ORDER BY c.embedding <=> ${JSON.stringify(vector)}::vector,c.id LIMIT ${config.vectorTopK}`;
    return rows
      .map(rowEvidence)
      .filter((e) => approvedSource(e.canonicalUrl, e.sourceId));
  });
  const [l, s] = await Promise.all([lexical, semantic]);
  return { lexical: l, semantic: s };
}
export function fuseCandidates(
  lists: CandidateLists,
  q: QueryUnderstanding,
  config: SearchConfig,
  now = new Date(),
): Evidence[] {
  const scores = new Map<string, Evidence>();
  for (const [key, list] of Object.entries(lists) as [
    "lexical" | "semantic",
    Evidence[],
  ][]) {
    const weight =
      config.fusionAlgorithm === "rrf"
        ? 1
        : key === "lexical"
          ? config.lexicalWeight
          : config.vectorWeight;
    list.forEach((e, i) => {
      if (
        !e.available ||
        !compatibleJurisdiction(e.jurisdiction, q.jurisdiction) ||
        !approvedSource(e.canonicalUrl, e.sourceId) ||
        (e.validUntil && Date.parse(e.validUntil) <= now.getTime())
      )
        return;
      const prev = scores.get(e.chunkId);
      scores.set(e.chunkId, {
        ...e,
        score: (prev?.score ?? 0) + weight / (config.fusionK + i + 1),
      });
    });
  }
  return [...scores.values()]
    .map((e) => {
      const direct = q.likelyOrganizations.includes(e.sourceId) ? 0.2 : 0;
      const exact = q.jurisdiction === e.jurisdiction ? 0.2 : 0;
      const age = e.sourceUpdatedAt
        ? Math.max(
            0,
            (now.getTime() - Date.parse(e.sourceUpdatedAt)) / 86400000,
          )
        : null;
      const freshness =
        age === null ? 0 : Math.exp(-age / 365) * config.freshnessWeight;
      const title = normalizeText(e.title + " " + e.heading);
      const titleMatch =
        (q.keywords.filter((k) => title.includes(normalizeText(k))).length /
          Math.max(1, q.keywords.length)) *
        0.2;
      return {
        ...e,
        score:
          e.score *
          (1 +
            (e.authorityScore / 100) * config.authorityWeight +
            direct +
            exact +
            freshness +
            titleMatch),
      };
    })
    .sort((a, b) => b.score - a.score || a.chunkId.localeCompare(b.chunkId));
}
export function selectRerankCandidates(
  candidates: Evidence[],
  q: QueryUnderstanding,
  config: SearchConfig,
): Evidence[] {
  if (!config.diverseReranking) return candidates.slice(0, config.rerankerTopK);
  const selected = new Set<string>();
  const perDocument = new Map<string, number>();
  const add = (e: Evidence) => {
    const count = perDocument.get(e.documentId) ?? 0;
    if (
      selected.size >= config.rerankerTopK ||
      selected.has(e.chunkId) ||
      count >= config.rerankerChunksPerDocument
    )
      return;
    selected.add(e.chunkId);
    perDocument.set(e.documentId, count + 1);
  };
  // Reserve a candidate for each implicated publisher before a long document fills the window.
  // These are still candidates: the semantic reranker must reject irrelevant material.
  for (const sourceId of q.likelyOrganizations) {
    const candidate = candidates.find((e) => e.sourceId === sourceId);
    if (candidate) add(candidate);
  }
  for (const candidate of candidates) add(candidate);
  return candidates.filter((e) => selected.has(e.chunkId));
}
export function previewCandidates(
  q: QueryUnderstanding,
  corpus: Evidence[],
  config: SearchConfig,
): Evidence[] {
  const scored = corpus
    .filter((e) => compatibleJurisdiction(e.jurisdiction, q.jurisdiction))
    .map((e) => {
      const text = normalizeText(e.title + " " + e.content);
      return {
        ...e,
        score: q.keywords.filter((w) => text.includes(normalizeText(w))).length,
      };
    })
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score);
  return fuseCandidates(
    { lexical: scored.slice(0, config.lexicalTopK), semantic: [] },
    q,
    config,
  );
}
