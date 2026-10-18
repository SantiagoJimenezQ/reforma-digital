import path from 'node:path';
import {
  applyPolicy,
  detectHeuristics,
  detectNer,
  loadNerClassifier,
  premask,
  projectMaskedSpan,
  type PiiLabel,
  type Span,
  type TokenClassifier,
} from '@nationaldesignstudio/rampart';
import { GENERICAS, type TIPOS_DATO } from './profile';

/**
 * Detector local de datos personales para lo que no está en «Mis datos»: el nombre del hijo que
 * escribe la persona, los datos que muestra una sede tras iniciar sesión… Une reglas para los
 * documentos, cuentas, contactos, direcciones y fechas de nacimiento españoles con Rampart
 * (CC BY 4.0, National Design Studio), un modelo de 15 MB que reconoce nombres y direcciones.
 * Corre en este ordenador: lo que analiza no sale de él.
 */
export type TipoDato = keyof typeof TIPOS_DATO;
export type DatoDetectado = { inicio: number; fin: number; tipo: TipoDato };
/** Lo que escribe la persona o lo que muestra una web. */
export type OrigenTexto = 'persona' | 'pagina';
export type Detector = (texto: string, origen: OrigenTexto) => Promise<DatoDetectado[]>;

/** El detector no ha podido analizar un texto: el turno se para sin enviar nada al modelo. */
export class ErrorDeProteccion extends Error {}

const TIPOS: Partial<Record<PiiLabel, TipoDato>> = {
  GIVEN_NAME: 'nombre',
  SURNAME: 'apellido',
  STREET_NAME: 'direccion',
  GOVERNMENT_ID: 'documento',
  TAX_ID: 'documento',
  PASSPORT: 'documento',
  DRIVERS_LICENSE: 'documento',
  SSN: 'documento',
  BANK_ACCOUNT: 'cuenta',
  ROUTING_NUMBER: 'cuenta',
  CREDIT_CARD: 'cuenta',
  PHONE: 'telefono',
  EMAIL: 'correo',
  IP_ADDRESS: 'dato',
};
/** Se quedan en el texto: el municipio y la provincia sirven para investigar y los enlaces para navegar. */
const SE_QUEDAN: PiiLabel[] = ['CITY', 'STATE', 'ZIP_CODE', 'URL'];
const NOMBRES = new Set<PiiLabel>(['GIVEN_NAME', 'SURNAME']);
const LETRA = /[\p{L}\p{N}]/u;

/**
 * Lo que el modelo marca y no suele ser un dato, medido con frases de personas y de sedes:
 * un trozo de palabra («cie» en «Hacienda»), un número suelto («Modelo 030»: los portales los
 * encuentran las reglas), un «nombre» en minúsculas («hijo») o de una palabra con poca confianza
 * («Getafe», «Alta»). En las páginas, además, las calles (son las de las oficinas), lo que tiene
 * poca confianza y una palabra seguida de minúscula: los verbos de las sedes («Elija la oficina»).
 */
function fiable(s: Span, texto: string, origen: OrigenTexto) {
  if (LETRA.test(texto[s.start - 1] ?? '') || LETRA.test(texto[s.end] ?? '')) return false;
  if (origen === 'pagina' && (s.label === 'STREET_NAME' || s.score < 0.6)) return false;
  if (!NOMBRES.has(s.label)) return true;
  const valor = texto.slice(s.start, s.end);
  const suelto = !/\s/.test(valor.trim());
  if (!/\p{Lu}/u.test(valor) || (suelto && s.score < 0.6)) return false;
  return !(origen === 'pagina' && suelto && /^ \p{Ll}/u.test(texto.slice(s.end, s.end + 2)));
}

const VIA =
  'c\\/|calle|avda\\.?|avenida|av\\.|plaza|pza\\.?|paseo|p[º°]|carretera|ctra\\.?|ronda|traves[ií]a|glorieta|callej[oó]n|urbanizaci[oó]n|urb\\.|pasaje|rambla';
const PALABRA = "[\\p{L}\\p{N}][\\p{L}\\p{N}.'’-]*";
/** El nombre de la vía y el número o «s/n», con el piso, la escalera o la puerta. */
const RESTO_DIRECCION = `${PALABRA}(?:\\s+${PALABRA}){0,5}?,?\\s*(?:n[º°.]\\s*)?(?:\\d{1,4}(?:\\s?[a-z](?![\\p{L}]))?|s\\/n)(?:,?\\s*(?:\\d{1,2}\\s?\\.?[º°ª]\\s?[a-z]{0,4}\\.?|bajo|[áa]tico|esc(?:alera)?\\.?\\s*\\w+|puerta\\s*\\w+|piso\\s*\\w+))*`;
/** Tras una abreviatura («c/mayor», «avda.»), el nombre puede ir pegado. */
const TIPO_VIA = `(?:${VIA})(?:(?<=[./º°])\\s*|\\s+)`;
/**
 * «Calle Mayor 1, 2º B», «Avda. de la Constitución, nº 45»: el tipo de vía, el nombre y el número.
 * Detrás de «Domicilio:» o «Dirección:» basta con el nombre y el número, y se oculta sin la etiqueta.
 */
const DIRECCION = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:(?:domicilio|direcci[oó]n)(?:\\s+postal)?\\s*:\\s*((?:${TIPO_VIA})?${RESTO_DIRECCION})|${TIPO_VIA}${RESTO_DIRECCION})`,
  'dgiu',
);
/** Una fecha poco después de «nacido», «nacimiento»…: la de nacimiento, sea de quien sea. */
const NACIMIENTO =
  /(?:naci(?:d[oa]s?|miento|ó)|f\.\s*nac\.?)\D{0,30}?(\d{1,2}[/.-]\d{1,2}[/.-](?:19|20)\d{2}|\d{1,2}\s+de\s+\p{L}+\s+(?:de|del)\s+(?:19|20)\d{2}|(?:19|20)\d{2}-\d{2}-\d{2})/dgiu;

/**
 * Identificadores sin letra ni dígitos de control (pasaporte, soporte, expediente, localizador…):
 * sin algoritmo que los valide, solo cuentan detrás de la etiqueta que dice qué son, con al menos
 * cinco letras o cifras y alguna cifra («expediente nº 2024/000123», no «expediente 2024»).
 */
const NUMERO_ID = '(?=[\\p{L}\\p{N}./-]*\\d)[\\p{L}\\p{N}](?:[./-]?[\\p{L}\\p{N}]){4,}';
/** Matrículas: la actual (0000 BBB, sin vocales) y la provincial (M-1234-AB). */
const MATRICULA = '\\d{4}[\\s-]?[B-DF-HJ-NP-TV-Z]{3}|[A-Z]{1,2}[\\s-]?\\d{4}[\\s-]?[A-Z]{1,2}';
/** Entre la etiqueta y el valor, «nº», «núm.», «:» o «es» («mi pasaporte es …»). */
const etiquetado = (etiquetas: string, valor = NUMERO_ID, hueco = '(?:\\s+es)?') =>
  new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${etiquetas})${hueco}[\\s:.#º°ª-]*(?:n(?:[uú]m(?:ero)?)?[\\s:.#º°ª-]+)?(${valor})(?![\\p{L}\\p{N}])`,
    'dgiu',
  );
const ETIQUETADOS: [RegExp, TipoDato][] = [
  [etiquetado('pasaporte|soporte|idesp'), 'documento'],
  [
    etiquetado(
      'expediente|localizador|justificante|csv|c[oó]digo\\s+seguro\\s+de\\s+verificaci[oó]n',
    ),
    'referencia',
  ],
  // El formato de la matrícula es tan concreto que admite unas palabras en medio: «la matrícula del coche es».
  [etiquetado('matr[ií]cula', MATRICULA, '(?:\\s+\\p{L}+){0,4}?'), 'referencia'],
];

const PARENTESCO =
  'hij[oa]|madre|padre|marido|mujer|espos[oa]|pareja|herman[oa]|abuel[oa]|niet[oa]|t[ií][oa]|sobrin[oa]|prim[oa]|suegr[oa]|cuñad[oa]|yerno|nuera|novi[oa]|beb[ée]|niñ[oa]';
/**
 * Lo que presenta un nombre: «me llamo», «a nombre de», «Titular:», «mi hija» y, aparte
 * (`TRATAMIENTO`), «D.ª» o «Don». Detrás va el
 * nombre propio, en mayúscula (`NOMBRE_PROPIO`), aunque el modelo no lo reconozca. «Don» y «doña»
 * solo van delante de un nombre de pila; «Sr.» no basta, porque también va delante de un cargo
 * («Sr. Ministro de Hacienda»): cuenta solo seguido de «D.» o «Dña.».
 */
const PRESENTA_NOMBRE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:(?:me\\s+llamo|mi\\s+nombre\\s+es|a\\s+nombre\\s+de|(?:mi|tu|su|nuestr[oa])\\s+(?:${PARENTESCO}))\\s+|(?:nombre(?:\\s+y\\s+apellidos)?|apellidos|titular)\\s*:[^\\S\\n]*)`,
  'giu',
);
/**
 * Los tratamientos delante de un nombre: «don» y «doña», y sus abreviaturas en mayúscula y sin otra
 * delante. «d.» en minúscula es la letra de un apartado («d. El certificado…») y «R.D.», un real
 * decreto.
 */
const TRATAMIENTO = /(?<![\p{L}\p{N}.])(?:D\.?ª\s*|(?:Dña|D)\.\s*|[Dd](?:on|oña)\s+)+/gu;
/**
 * Palabras en mayúscula, con «de», «del» o «de la» entre ellas: «María de la Fuente». Una palabra
 * seguida de «:» es otra etiqueta de un formulario vacío («Nombre: Apellidos:»), no un nombre.
 */
const NOMBRE_PROPIO =
  /\p{Lu}[\p{L}'’-]+(?:\s+(?:del?\s+(?:l[ao]s?\s+)?)?\p{Lu}[\p{L}'’-]+){0,4}(?![\p{L}'’-]|\s*:)/uy;

/** Lo que encuentran las reglas, sin el modelo. */
export function datosPorReglas(texto: string): DatoDetectado[] {
  const datos: DatoDetectado[] = [];
  for (const r of GENERICAS)
    for (const m of texto.matchAll(r.patron))
      if (!r.valido || r.valido(m[0]))
        datos.push({
          inicio: m.index,
          fin: m.index + m[0].length,
          tipo: r.tipo,
        });
  const grupo = (re: RegExp, tipo: TipoDato) => {
    for (const m of texto.matchAll(re)) {
      const [inicio, fin] = m.indices!.slice(1).find(Boolean) ?? m.indices![0]!;
      datos.push({ inicio, fin, tipo });
    }
  };
  grupo(DIRECCION, 'direccion');
  grupo(NACIMIENTO, 'fecha');
  for (const [re, tipo] of ETIQUETADOS) grupo(re, tipo);
  // El nombre de pila y, aparte, los apellidos: el agente puede escribirlos en campos distintos.
  for (const m of [...texto.matchAll(PRESENTA_NOMBRE), ...texto.matchAll(TRATAMIENTO)]) {
    NOMBRE_PROPIO.lastIndex = m.index + m[0].length;
    const nombre = NOMBRE_PROPIO.exec(texto);
    if (!nombre) continue;
    const pila = /^\S+/.exec(nombre[0])![0];
    datos.push({ inicio: nombre.index, fin: nombre.index + pila.length, tipo: 'nombre' });
    const resto = nombre[0].slice(pila.length).trimStart();
    if (resto) {
      const fin = nombre.index + nombre[0].length;
      datos.push({ inicio: fin - resto.length, fin, tipo: 'apellido' });
    }
  }
  return unir(datos);
}

/**
 * Une los trozos que se solapan: «Calle» (modelo) y «Calle Mayor 1, 2º B» (regla) son un solo
 * dato, del tipo más concreto que se haya encontrado.
 */
export function unir(datos: DatoDetectado[]): DatoDetectado[] {
  const out: DatoDetectado[] = [];
  for (const d of [...datos].sort((a, b) => a.inicio - b.inicio || b.fin - a.fin)) {
    const previo = out.at(-1);
    if (!previo || d.inicio >= previo.fin) out.push({ ...d });
    else {
      previo.fin = Math.max(previo.fin, d.fin);
      if (previo.tipo === 'dato') previo.tipo = d.tipo;
    }
  }
  return out;
}

/**
 * Carga el modelo desde una carpeta local (nunca de internet) y devuelve el detector. Falla si el
 * modelo no está o no se puede cargar: sin detector, la app no envía nada al asistente.
 */
export async function crearDetector(carpeta: string): Promise<Detector> {
  const { env } = await import('@huggingface/transformers');
  env.allowRemoteModels = false;
  env.localModelPath = path.dirname(carpeta);
  const agrupado = await loadNerClassifier({ model: path.basename(carpeta), device: 'cpu' });
  // transformers.js 4 devuelve los grupos sin su posición, y Rampart (hecho para la versión 3) los
  // une aunque estén lejos: «Iker Arrieta y para mi madre Carmen». Se le dan las piezas sueltas,
  // con su B-/I-, y las agrupa él.
  const clasificador: TokenClassifier = Object.assign((t: string) => agrupado(t), {
    countTokens: agrupado.countTokens,
    tokenize: agrupado.tokenize,
  });
  return async (texto, origen) => {
    try {
      const reglas = detectHeuristics(texto);
      const mapa = premask(texto, reglas);
      const modelo = (await detectNer(mapa.masked, clasificador)).flatMap((s) => {
        const p = projectMaskedSpan(s, texto, mapa);
        return p && fiable(p, texto, origen) ? [p] : [];
      });
      const rampart = applyPolicy([...reglas, ...modelo], new Set(SE_QUEDAN)).flatMap((s) => {
        const tipo = TIPOS[s.label];
        return tipo ? [{ inicio: s.start, fin: s.end, tipo }] : [];
      });
      return unir([...rampart, ...datosPorReglas(texto)]);
    } catch (e) {
      throw new ErrorDeProteccion(
        `No se han podido proteger los datos personales: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };
}
