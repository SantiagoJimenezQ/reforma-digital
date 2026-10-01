import type { Source } from "@gov/core";
const define = (
  id: string,
  name: string,
  baseUrl: string,
  hosts: string[],
  jurisdictionValue: string,
  seeds: string[],
  sourceType: Source["sourceType"] = "web",
): Source => ({
  id,
  name,
  baseUrl,
  hosts,
  organization: name,
  jurisdictionType:
    jurisdictionValue === "ES"
      ? "country"
      : jurisdictionValue === "ES-MD"
        ? "region"
        : "municipality",
  jurisdictionValue,
  sourceType,
  authorityScore: id === "administracion" ? 80 : 100,
  enabled: true,
  crawlConfig: { seeds, maxPages: 60, recrawlHours: id === "boe" ? 24 : 168 },
});
export const sources: Source[] = [
  define(
    "administracion",
    "Punto de Acceso General",
    "https://administracion.gob.es",
    ["administracion.gob.es"],
    "ES",
    ["https://administracion.gob.es/"],
  ),
  define(
    "interior",
    "Ministerio del Interior",
    "https://www.interior.gob.es",
    ["www.interior.gob.es", "interior.gob.es"],
    "ES",
    [
      "https://www.interior.gob.es/opencms/es/servicios-al-ciudadano/tramites-y-gestiones/dni/",
      "https://www.interior.gob.es/opencms/es/servicios-al-ciudadano/tramites-y-gestiones/dni/cita-previa/",
      "https://www.interior.gob.es/opencms/es/servicios-al-ciudadano/tramites-y-gestiones/dni/documentacion-necesaria-para-su-tramitacion/",
    ],
  ),
  define(
    "boe",
    "Boletín Oficial del Estado",
    "https://www.boe.es",
    ["www.boe.es", "boe.es"],
    "ES",
    ["BOE-A-2015-10565", "BOE-A-2015-11724"],
    "boe-api",
  ),
  define(
    "aeat",
    "Agencia Tributaria",
    "https://sede.agenciatributaria.gob.es",
    ["sede.agenciatributaria.gob.es", "www3.agenciatributaria.gob.es"],
    "ES",
    [
      "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G322.shtml",
      "https://sede.agenciatributaria.gob.es/Sede/Renta.html",
    ],
  ),
  define(
    "seg-social",
    "Seguridad Social · Importass",
    "https://portal.seg-social.gob.es",
    ["portal.seg-social.gob.es", "www.seg-social.es", "sede.seg-social.gob.es"],
    "ES",
    [
      "https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Vida+laboral+e+informes/Informes+sobre+tu+situacion+laboral/Informe+de+tu+vida+laboral",
      "https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Altas,+bajas+y+modificaciones/Altas+y+afiliacion+de+trabajadores/Alta_trabajo_autonomo",
    ],
  ),
  define(
    "dgt",
    "Dirección General de Tráfico",
    "https://sede.dgt.gob.es",
    ["sede.dgt.gob.es", "www.dgt.es"],
    "ES",
    [
      "https://sede.dgt.gob.es/es/permisos-de-conducir/",
      "https://sede.dgt.gob.es/es/multas/",
    ],
  ),
  define(
    "sepe",
    "Servicio Público de Empleo Estatal",
    "https://www.sepe.es",
    ["www.sepe.es", "sede.sepe.gob.es"],
    "ES",
    ["https://www.sepe.es/HomeSepe/prestaciones-desempleo.html"],
  ),
  define(
    "educacion",
    "Ministerio de Educación",
    "https://www.becaseducacion.gob.es",
    [
      "www.becaseducacion.gob.es",
      "www.educacionfpydeportes.gob.es",
      "sede.educacion.gob.es",
    ],
    "ES",
    [
      "https://www.becaseducacion.gob.es/becas-y-ayudas.html",
      "https://www.becaseducacion.gob.es/dudas/asi-de-facil.html",
    ],
  ),
  define(
    "comunidad-madrid",
    "Comunidad de Madrid",
    "https://www.comunidad.madrid",
    ["www.comunidad.madrid", "sede.comunidad.madrid"],
    "ES-MD",
    [
      "https://www.comunidad.madrid/empleo/oficina-empleo",
      "https://www.comunidad.madrid/servicios/salud/tarjeta-sanitaria",
    ],
  ),
  define(
    "ayuntamiento-madrid",
    "Ayuntamiento de Madrid",
    "https://sede.madrid.es",
    ["sede.madrid.es", "www.madrid.es"],
    "ES-MD-MADRID",
    [
      "https://sede.madrid.es/portal/site/tramites/menuitem.1f3361415fda829be152e15284f1a5a0/?vgnextchannel=775ba38813180210VgnVCM100000c90da8c0RCRD&vgnextoid=3e3debb41f6e2410VgnVCM2000000c205a0aRCRD",
    ],
  ),
];
export function approvedSource(
  url: string,
  sourceId?: string,
): Source | undefined {
  try {
    const u = new URL(url);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      (u.port && u.port !== "443")
    )
      return;
    return sources.find(
      (s) =>
        s.enabled &&
        (!sourceId || s.id === sourceId) &&
        s.hosts.includes(u.hostname),
    );
  } catch {
    return;
  }
}
export function canonicalize(url: string): string {
  const u = new URL(url);
  u.hash = "";
  for (const key of [...u.searchParams.keys()])
    if (/^(utm_|fbclid|gclid|print$|imprimir$)/i.test(key))
      u.searchParams.delete(key);
  u.searchParams.sort();
  return u.toString();
}
export function sourceById(id: string): Source {
  const s = sources.find((s) => s.id === id && s.enabled);
  if (!s) throw new Error("Fuente no aprobada: " + id);
  return s;
}
/** A national publisher can publish region-specific procedures. Publisher != applicability. */
export function documentJurisdiction(
  source: Source,
  title: string,
  url: string,
): string {
  if (source.jurisdictionValue !== "ES") return source.jurisdictionValue;
  const scope = decodeURI(title + " " + url)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  const regions: [RegExp, string][] = [
    [/asturias/, "ES-AS"],
    [/andalucia/, "ES-AN"],
    [/aragon/, "ES-AR"],
    [/illes.balears|islas.baleares/, "ES-IB"],
    [/canarias/, "ES-CN"],
    [/cantabria/, "ES-CB"],
    [/castilla.la.mancha/, "ES-CM"],
    [/castilla.y.leon/, "ES-CL"],
    [/cataluna|catalunya/, "ES-CT"],
    [/comunitat.valenciana|comunidad.valenciana/, "ES-VC"],
    [/extremadura/, "ES-EX"],
    [/galicia/, "ES-GA"],
    [/comunidad.de.madrid|comunidad-autonoma-madrid/, "ES-MD"],
    [/region.de.murcia/, "ES-MC"],
    [/navarra/, "ES-NC"],
    [/pais.vasco|euskadi/, "ES-PV"],
    [/la.rioja/, "ES-RI"],
    [/ceuta/, "ES-CE"],
    [/melilla/, "ES-ML"],
  ];
  const matches = regions.filter(([re]) => re.test(scope));
  return matches.length === 1 ? matches[0]![1] : source.jurisdictionValue;
}
export function documentYear(title: string, url: string): number | null {
  const match = (title + " " + url).match(
    /(?:irpf[ -]|manual[^/]*?|renta[ -]|curso[ -])(20\d{2})/i,
  );
  return match ? Number(match[1]) : null;
}

const discoveryScopes: Record<
  string,
  { includePaths: string[]; priorityTerms: string[] }
> = {
  administracion: {
    includePaths: [
      "^/tu-espacio-europeo/",
      "^/tramites-electronicos/",
      "^/lectura-facil/",
    ],
    priorityTerms: ["DNI", "pasaporte", "registro electronico", "documentos"],
  },
  interior: {
    includePaths: ["^/opencms/.*/servicios-al-ciudadano/tramites-y-gestiones/dni/"],
    priorityTerms: ["DNI", "cita previa", "renovacion", "documentacion"],
  },
  aeat: {
    includePaths: [
      "^/Sede/(procedimientos|procedimientoini|Renta|censos-nif-domicilio-fiscal|iva)",
      "^/Sede/ayuda/.*/irpf-2025",
    ],
    priorityTerms: ["036", "renta", "domicilio fiscal", "certificado", "303"],
  },
  "seg-social": {
    includePaths: ["/Categorias/", "/tramites/", "/Colectivos/"],
    priorityTerms: [
      "vida laboral",
      "autonomo",
      "cotizacion",
      "situacion actual",
      "numero seguridad social",
    ],
  },
  dgt: {
    includePaths: ["^/es/(permisos-de-conducir|multas|vehiculos)/"],
    priorityTerms: [
      "renovacion",
      "pago multas",
      "puntos",
      "duplicado",
      "examen",
    ],
  },
  sepe: {
    includePaths: [
      "^/HomeSepe/(prestaciones-desempleo|personas|Personas)/",
      "^/portalSede/procedimientos-y-servicios/personas/",
    ],
    priorityTerms: [
      "prestacion contributiva",
      "solicitud",
      "certificado prestaciones",
      "pago unico",
      "documentacion",
    ],
  },
  educacion: {
    includePaths: ["^/becas-y-ayudas/", "^/dudas/"],
    priorityTerms: [
      "que necesitas",
      "como solicitar",
      "plazos",
      "universidad",
      "no universitarios",
    ],
  },
  "comunidad-madrid": {
    includePaths: [
      "^/servicios/",
      "^/salud/",
      "^/empleo/",
      "^/prestaciones/",
      "^/prestacion-social/",
      "^/autorizaciones-licencias-permisos-carnes/",
      "^/discapacidad/",
      "^/inscripciones-registro/",
      "^/ayudas-becas-subvenciones/",
    ],
    priorityTerms: [
      "demanda empleo",
      "tarjeta sanitaria",
      "familia numerosa",
      "discapacidad",
      "dependencia",
    ],
  },
  "ayuntamiento-madrid": {
    includePaths: ["^/portal/site/tramites/"],
    priorityTerms: [
      "padron",
      "empadronamiento",
      "certificado empadronamiento",
      "cambio domicilio",
      "alta padron",
    ],
  },
};
for (const s of sources)
  Object.assign(s.crawlConfig, discoveryScopes[s.id] ?? {});
export function eligibleDocument(
  source: Source,
  title: string,
  url: string,
): boolean {
  if (!approvedSource(url, source.id)) return false;
  const text = (url + " " + title)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (
    /prensa|\/noticias\/|\/revista\/|\/agenda-gobierno\/|\/mapaweb|\/(en_gb|ca_es|gl_es|ca|gl|eu|en)\//.test(
      text,
    )
  )
    return false;
  if (
    source.sourceType === "boe-api" ||
    source.crawlConfig.seeds.some((s) => canonicalize(s) === canonicalize(url))
  )
    return true;
  return !!source.crawlConfig.includePaths?.some((p) =>
    new RegExp(p).test(new URL(url).pathname),
  );
}

// Reviewed discovery entry points: restricted to the already approved publishers.
const curatedSeeds: Record<string, string[]> = {
  "comunidad-madrid": [
    "https://sede.comunidad.madrid/autorizaciones-licencias-permisos-carnes/titulo-familia-numerosa",
    "https://sede.comunidad.madrid/prestacion-social/reconocimiento-dependencia",
    "https://sede.comunidad.madrid/servicios/tramitacion-grado-discapacidad",
  ],
  administracion: [
    "https://administracion.gob.es/tu-espacio-europeo/derechos-obligaciones/empresas/inicio-gestion-cierre/registro-cambio-cierre/crear",
    "https://administracion.gob.es/pag_Home/Lectura-Facil/Como-realizar-tramites.html",
    "https://administracion.gob.es/tramites-electronicos/servicioselectronicosfrecuentes/obtencion-certificado-electronico-fnmt",
  ],
  aeat: [
    "https://sede.agenciatributaria.gob.es/Sede/iva/presentar-declaracion-iva-modelo-303/formas-presentacion-modelo-303.html",
    "https://sede.agenciatributaria.gob.es/Sede/censos-nif-domicilio-fiscal/domicilio-ciudadanos/comunicar-cambio-domicilio-fiscal.html",
    "https://www3.agenciatributaria.gob.es/Sede/procedimientoini/G304.shtml",
  ],
  sepe: [
    "https://sede.sepe.gob.es/portalSede/procedimientos-y-servicios/personas/proteccion-por-desempleo/obtencion-de-certificados",
    "https://www.sepe.es/HomeSepe/prestaciones-desempleo/prestacion-contributiva/prestacion-contributiva-mas-de-un-anyo.html",
  ],
  dgt: [
    "https://sede.dgt.gob.es/es/permisos-de-conducir/obtencion-y-gestion-de-permisos/renovacion-de-permiso-proximo-a-caducar/",
    "https://sede.dgt.gob.es/es/permisos-de-conducir/permiso-por-puntos/consulta-de-puntos/",
  ],
};
for (const source of sources)
  source.crawlConfig.seeds.push(...(curatedSeeds[source.id] ?? []));
