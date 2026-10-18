import type { Detector, OrigenTexto, TipoDato } from './detector';

/**
 * «Mis datos»: el perfil local de la persona y la capa que impide que sus identificadores lleguen
 * al modelo. El modelo trabaja con marcadores (`{{documento_numero}}`) y la app los sustituye por
 * el valor real solo al escribir en una web oficial.
 */

/** `contexto` se comparte con el modelo (sirve para investigar); `identificador` nunca. */
export type Sensibilidad = 'identificador' | 'contexto';
export type TipoCampo = 'texto' | 'fecha' | 'opcion' | 'email' | 'telefono';

export type CampoPerfil = {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  privacidad: Sensibilidad;
  grupo: 'Identidad' | 'Documento' | 'Contacto' | 'Domicilio' | 'Otros';
  opciones?: readonly string[];
};

const campo = (
  clave: string,
  etiqueta: string,
  grupo: CampoPerfil['grupo'],
  privacidad: Sensibilidad,
  tipo: TipoCampo = 'texto',
  opciones?: readonly string[],
): CampoPerfil => ({ clave, etiqueta, grupo, privacidad, tipo, ...(opciones ? { opciones } : {}) });

export const camposPerfil: readonly CampoPerfil[] = [
  campo('nombre', 'Nombre', 'Identidad', 'identificador'),
  campo('apellido1', 'Primer apellido', 'Identidad', 'identificador'),
  campo('apellido2', 'Segundo apellido', 'Identidad', 'identificador'),
  campo('fecha_nacimiento', 'Fecha de nacimiento', 'Identidad', 'identificador', 'fecha'),
  campo('sexo', 'Sexo', 'Identidad', 'contexto', 'opcion', ['Mujer', 'Hombre']),
  campo('nacionalidad', 'Nacionalidad', 'Identidad', 'contexto'),
  campo('estado_civil', 'Estado civil', 'Identidad', 'contexto', 'opcion', [
    'Soltero/a',
    'Casado/a',
    'Pareja de hecho',
    'Separado/a',
    'Divorciado/a',
    'Viudo/a',
  ]),
  campo('documento_tipo', 'Tipo de documento', 'Documento', 'contexto', 'opcion', [
    'DNI',
    'NIE',
    'Pasaporte',
  ]),
  campo('documento_numero', 'Número de DNI, NIE o pasaporte', 'Documento', 'identificador'),
  campo('documento_soporte', 'Número de soporte', 'Documento', 'identificador'),
  campo('documento_caducidad', 'Caducidad del documento', 'Documento', 'identificador', 'fecha'),
  campo('nuss', 'Número de la Seguridad Social', 'Documento', 'identificador'),
  campo('telefono', 'Teléfono', 'Contacto', 'identificador', 'telefono'),
  campo('email', 'Correo electrónico', 'Contacto', 'identificador', 'email'),
  campo('direccion', 'Dirección (calle, número, piso)', 'Domicilio', 'identificador'),
  campo('codigo_postal', 'Código postal', 'Domicilio', 'identificador'),
  campo('municipio', 'Municipio', 'Domicilio', 'contexto'),
  campo('provincia', 'Provincia', 'Domicilio', 'contexto'),
  campo('iban', 'IBAN de tu cuenta', 'Otros', 'identificador'),
];

export type Perfil = Record<string, string>;

export const campoPerfil = (clave: string) => camposPerfil.find((c) => c.clave === clave);
/** Las claves desconocidas (datos que pide un trámite concreto) se tratan como identificadores. */
export const esIdentificador = (clave: string) => campoPerfil(clave)?.privacidad !== 'contexto';

const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';
const letraDni = (numero: string) => LETRAS_DNI[Number(numero) % 23];

/** Mensaje de error en lenguaje claro, o `null` si el valor es válido. */
export function validarCampo(clave: string, valor: string): string | null {
  const v = valor.trim();
  if (!v) return 'Escribe un valor.';
  if (v.length > 300) return 'El valor es demasiado largo.';
  if (clave === 'documento_numero') {
    const dni = /^(\d{8})[\s-]?([A-Z])$/i.exec(v);
    const nie = /^([XYZ])[\s-]?(\d{7})[\s-]?([A-Z])$/i.exec(v);
    if (dni)
      return letraDni(dni[1]!) === dni[2]!.toUpperCase() ? null : 'La letra del DNI no cuadra.';
    if (nie) {
      const numero = 'XYZ'.indexOf(nie[1]!.toUpperCase()) + nie[2]!;
      return letraDni(numero) === nie[3]!.toUpperCase() ? null : 'La letra del NIE no cuadra.';
    }
    return /^[A-Z0-9]{6,12}$/i.test(v) ? null : 'Revisa el número del documento.';
  }
  const tipo = campoPerfil(clave)?.tipo;
  if (tipo === 'fecha' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Usa una fecha válida.';
  if (tipo === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Revisa el correo.';
  if (tipo === 'telefono' && !/^(\+\d{2,3})?[\d\s.-]{9,14}$/.test(v)) return 'Revisa el teléfono.';
  if (clave === 'codigo_postal' && !/^(0[1-9]|[1-4]\d|5[0-2])\d{3}$/.test(v))
    return 'El código postal tiene 5 cifras.';
  if (
    clave === 'iban' &&
    (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/i.test(sinSeparadores(v)) || !ibanValido(v))
  )
    return 'Revisa el IBAN.';
  return null;
}

/** Normaliza lo que se guarda: fechas ISO, documento sin separadores, IBAN sin espacios. */
export function normalizarCampo(clave: string, valor: string): string {
  const v = valor.trim().replace(/\s+/g, ' ');
  if (clave === 'documento_numero' || clave === 'iban')
    return v.replace(/[\s-]/g, '').toUpperCase();
  return v;
}

function edad(fechaIso: string, hoy: Date): number | null {
  const [y, m, d] = fechaIso.split('-').map(Number);
  if (!y || !m || !d) return null;
  let anios = hoy.getFullYear() - y;
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) anios--;
  return anios >= 0 && anios < 130 ? anios : null;
}

/** La caducidad del documento sin la fecha: basta para saber si hay que renovarlo. */
function vigencia(fechaIso: string, hoy: Date): string {
  const fin = Date.parse(fechaIso);
  if (fechaIso.startsWith('9999')) return 'permanente';
  if (Number.isNaN(fin)) return '';
  if (fin < hoy.getTime()) return 'caducado';
  const meses = Math.floor((fin - hoy.getTime()) / (30.44 * 86400000));
  return meses < 1 ? 'caduca en menos de un mes' : `caduca en ${meses} meses`;
}

/** Lo que el modelo sabe del perfil: los datos de contexto y qué identificadores están guardados. */
export function perfilParaModelo(perfil: Perfil, hoy = new Date()): string {
  const lineas: string[] = [];
  const faltan: string[] = [];
  for (const c of camposPerfil) {
    const valor = perfil[c.clave];
    if (!valor) {
      faltan.push(c.clave);
      continue;
    }
    if (c.privacidad === 'contexto') lineas.push(`- ${c.clave} (${c.etiqueta}): ${valor}`);
    else {
      const extra =
        c.clave === 'fecha_nacimiento' && edad(valor, hoy) !== null
          ? `; edad: ${edad(valor, hoy)} años`
          : c.clave === 'documento_caducidad' && vigencia(valor, hoy)
            ? `; ${vigencia(valor, hoy)}`
            : '';
      lineas.push(`- ${c.clave} (${c.etiqueta}): {{${c.clave}}} (guardado${extra})`);
    }
  }
  for (const [clave, valor] of Object.entries(perfil))
    if (valor && !campoPerfil(clave)) lineas.push(`- ${clave}: {{${clave}}} (guardado)`);
  return [
    lineas.length ? lineas.join('\n') : '- (sin datos guardados)',
    faltan.length ? `Sin guardar: ${faltan.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

const MESES =
  'enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split(
    ' ',
  );
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const VOCALES: Record<string, string> = {
  a: 'aáàâä',
  e: 'eéèêë',
  i: 'iíìîï',
  o: 'oóòôö',
  u: 'uúùûü',
  n: 'nñ',
  c: 'cç',
};
/** Patrón que acepta mayúsculas, tildes y espacios distintos a los del valor guardado. */
function patronFlexible(valor: string): string {
  return [...valor.trim()]
    .map((ch) => {
      if (/\s/.test(ch)) return '\\s+';
      const base = ch
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
      return VOCALES[base] ? `[${VOCALES[base]}]` : escapar(ch);
    })
    .join('');
}
/** Dígitos con separadores opcionales entre ellos: «600 12 34 56», «600-123-456»… */
const digitosFlexibles = (digitos: string) => [...digitos].map(escapar).join('[\\s./-]?');

function variantes(clave: string, valor: string): string[] {
  const v = valor.trim();
  if (clave === 'documento_numero') {
    // También con puntos («12.345.678-Z») y solo el número, sin la letra.
    const m = /^([XYZ]?)(\d{7,8})([A-Z])$/i.exec(v);
    if (m) {
      const numero = `${m[1] ? `${m[1]}[\\s.-]?` : ''}${digitosFlexibles(m[2]!)}`;
      return [`${numero}[\\s.-]?${m[3]}`, numero];
    }
  }
  if (clave === 'telefono') {
    const digitos = v.replace(/\D/g, '').replace(/^(0034|34)(?=\d{9}$)/, '');
    if (digitos.length >= 9) return [`(?:(?:\\+|00)34[\\s.-]?)?${digitosFlexibles(digitos)}`];
  }
  if (clave === 'iban' || clave === 'nuss') return [digitosFlexibles(v.replace(/[\s/-]/g, ''))];
  if (campoPerfil(clave)?.tipo === 'fecha') {
    const [y, m, d] = v.split('-');
    if (y && m && d) {
      const dd = String(Number(d));
      const mm = String(Number(m));
      return [
        `${y}-${m}-${d}`,
        `0?${dd}[/.-]0?${mm}[/.-]${y}`,
        `0?${dd}\\s+de\\s+${MESES[Number(m) - 1]}\\s+(?:de\\s+|del\\s+)?${y}`,
      ];
    }
  }
  return [patronFlexible(v)];
}

type Regla = { patron: RegExp; marcador: string; clave: string; valido?: (v: string) => boolean };
/** Cualquier marcador, con su formato opcional: `{{fecha_nacimiento:dia}}`. */
export const MARCADOR = /\{\{([a-z0-9_.]+)(?::([a-z/]+))?\}\}/gi;
/** Claves de los datos que encuentra el detector o que trae una web: `{{nombre_1}}`, `{{dato_3}}`. */
export const DETECTADO =
  /^(nombre|apellido|direccion|documento|cuenta|telefono|correo|fecha|dato)_\d+$/;
/** Aplica `fn` solo al texto que hay entre marcadores: un valor («Correo») no toca {{correo_1}}. */
const fueraDeMarcadores = (texto: string, fn: (t: string) => string) =>
  texto
    .split(/(\{\{[a-z0-9_.]+(?::[a-z/]+)?\}\})/i)
    .map((t, i) => (i % 2 ? t : fn(t)))
    .join('');
const BORDE_INI = '(?<![\\p{L}\\p{N}])';
const BORDE_FIN = '(?![\\p{L}\\p{N}])';
/** Códigos que se reconocen aunque vayan pegados a letras («12345678ZLucía»): basta con que no haya más cifras. */
const CODIGOS = new Set([
  'documento_numero',
  'documento_soporte',
  'telefono',
  'iban',
  'nuss',
  'fecha_nacimiento',
  'email',
]);

const sinSeparadores = (v: string) => v.replace(/[\s-]/g, '').toUpperCase();
function ibanValido(v: string) {
  const s = sinSeparadores(v);
  let resto = 0;
  for (const c of s.slice(4) + s.slice(0, 4))
    for (const d of /\d/.test(c) ? c : String(c.charCodeAt(0) - 55))
      resto = (resto * 10 + Number(d)) % 97;
  return resto === 1;
}

/** Identificadores de cualquier persona. Los que se pueden validar se ocultan siempre antes del modelo. */
export const GENERICAS: readonly Regla[] = [
  {
    clave: 'dni',
    marcador: '[DNI]',
    patron: /(?<![\p{L}\p{N}])\d{8}[\s-]?[A-Z](?![\p{L}\p{N}])/giu,
    valido: (v) => letraDni(sinSeparadores(v).slice(0, 8)) === sinSeparadores(v).at(-1),
  },
  {
    clave: 'nie',
    marcador: '[NIE]',
    patron: /(?<![\p{L}\p{N}])[XYZ][\s-]?\d{7}[\s-]?[A-Z](?![\p{L}\p{N}])/giu,
    valido: (v) => {
      const s = sinSeparadores(v);
      return letraDni('XYZ'.indexOf(s[0]!) + s.slice(1, 8)) === s.at(-1);
    },
  },
  {
    clave: 'iban',
    marcador: '[IBAN]',
    patron:
      /(?<![\p{L}\p{N}])[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){4,7}(?:\s?[A-Z0-9]{1,4})?(?![\p{L}\p{N}])/giu,
    valido: ibanValido,
  },
  // Empieza donde empieza la palabra: sin ese límite, un texto largo sin espacios sería muy lento.
  { clave: 'email', marcador: '[correo]', patron: /(?<![\w.+-])[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gu },
  {
    clave: 'telefono',
    marcador: '[teléfono]',
    patron: /(?<![\d+])(?:(?:\+|00)34[\s.-]?)?[6789](?:[\s.-]?\d){8}(?!\d)/gu,
  },
];

const VALIDADAS = GENERICAS.filter((r) => r.valido);
/** Para comparar valores sin mayúsculas, tildes, espacios ni separadores. */
export const normalizarValor = (v: string) =>
  v
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');

/**
 * Sustituye los identificadores del perfil por su marcador. `usuario: true` añade los detectores
 * genéricos (DNI, NIE, IBAN, correo y teléfono de cualquiera) para las búsquedas. La última
 * comprobación (`laxo`) oculta además cualquier DNI, NIE o IBAN válido, venga de donde venga.
 */
export class Privacidad {
  private reglas: Regla[] = [];
  /**
   * Los códigos (documentos, teléfonos, cuentas, fechas, correos) sin ningún límite: para la última
   * comprobación. Los nombres no, porque «Lucía» está dentro de «Andalucía».
   */
  private laxas: Regla[] = [];
  /** Sustituciones hechas, por clave. Sin valores: sirve para auditoría y evaluaciones. */
  readonly registro: Record<string, number> = {};

  constructor(private perfil: Perfil) {
    this.actualizar(perfil);
  }

  actualizar(perfil: Perfil) {
    this.perfil = perfil;
    const codigo = (clave: string) =>
      CODIGOS.has(clave) || /^(documento|telefono|cuenta|correo|fecha)_\d+$/.test(clave);
    const reglas = (estricto: boolean) =>
      Object.entries(perfil)
        .filter(
          ([clave, valor]) =>
            esIdentificador(clave) &&
            // Lo que traía un campo ({{dato_N}}) solo se oculta en ese campo: puede ser cualquier
            // cosa («España») y como regla taparía también el texto de las webs oficiales.
            !/^dato_\d+$/.test(clave) &&
            (estricto || codigo(clave)) &&
            valor.trim().length >= (estricto ? 3 : 5),
        )
        .flatMap(([clave, valor]) => {
          const esCodigo = codigo(clave);
          const ini = !estricto ? '' : esCodigo ? '(?<!\\d)' : BORDE_INI;
          const fin = !estricto ? '' : esCodigo ? '(?!\\d)' : BORDE_FIN;
          return variantes(clave, valor).map((p) => ({
            clave,
            marcador: `{{${clave}}}`,
            patron: new RegExp(ini + p + fin, 'giu'),
          }));
        })
        // Primero los valores largos: «García López» antes que «García».
        .sort((a, b) => b.patron.source.length - a.patron.source.length);
    this.reglas = reglas(true);
    this.laxas = reglas(false);
  }

  limpiar(texto: string, opciones: { usuario?: boolean; laxo?: boolean } = {}): string {
    let out = texto;
    const base = opciones.laxo ? [...this.laxas, ...this.reglas, ...VALIDADAS] : this.reglas;
    for (const regla of opciones.usuario ? [...base, ...GENERICAS] : base)
      out = fueraDeMarcadores(out, (t) =>
        t.replace(regla.patron, (m) => {
          if (regla.valido && !regla.valido(m)) return m;
          this.registro[regla.clave] = (this.registro[regla.clave] ?? 0) + 1;
          return regla.marcador;
        }),
      );
    return out;
  }

  /** ¿Contiene el texto algún valor del perfil o un DNI, NIE o IBAN válido? Para la última comprobación. */
  contieneDatos(texto: string): boolean {
    const sinMarcadores = texto.replace(MARCADOR, ' ');
    return [...this.laxas, ...this.reglas, ...VALIDADAS].some((r) =>
      [...sinMarcadores.matchAll(r.patron)].some((m) => !r.valido || r.valido(m[0])),
    );
  }

  /**
   * `limpiar` y, además, lo que encuentre el detector local. Lo que escribe la persona pasa a ser
   * un dato del trámite con su propio marcador (`{{nombre_1}}`), que se oculta también donde
   * vuelva a salir y que la app puede escribir en una web oficial. Lo que sale de una página se
   * oculta solo ahí (`{{dato_N}}`): una regla taparía también el texto de las webs oficiales.
   */
  async proteger(
    texto: string,
    detector: Detector,
    datos: Perfil,
    origen: OrigenTexto,
  ): Promise<string> {
    // Los marcadores que ya hay se quedan, lo guardado conserva su marcador y el detector mira el
    // texto original: con marcadores dentro («LUCÍA {{apellido1}} ORTUZAR») pierde el contexto.
    const tramos = [...texto.matchAll(MARCADOR)].map((m) => ({
      inicio: m.index,
      fin: m.index + m[0].length,
      clave: '',
    }));
    const solapa = (a: number, b: number) => tramos.some((t) => a < t.fin && b > t.inicio);
    for (const r of this.reglas)
      for (const m of texto.matchAll(r.patron))
        if (!solapa(m.index, m.index + m[0].length))
          tramos.push({ inicio: m.index, fin: m.index + m[0].length, clave: r.clave });
    for (const d of await detector(texto, origen)) {
      // Solo lo que no es ya un dato: «Iker Zubeldia» con Zubeldia guardado deja «Iker».
      let piezas = [[d.inicio, d.fin]];
      for (const t of tramos)
        piezas = piezas.flatMap(([a = 0, b = 0]) =>
          t.fin <= a || t.inicio >= b
            ? [[a, b]]
            : [...(t.inicio > a ? [[a, t.inicio]] : []), ...(t.fin < b ? [[t.fin, b]] : [])],
        );
      for (const [a = 0, b = 0] of piezas) {
        // Sin los espacios y signos de los bordes: «Iker,» se guarda como «Iker».
        const bruto = texto.slice(a, b);
        const valor = bruto.replace(/^[\s,.;:()|]+|[\s,.;:()|]+$/g, '');
        if (!normalizarValor(valor)) continue;
        const todos = { ...this.perfil, ...datos };
        const clave = claveDeDato(todos, origen === 'pagina' ? 'dato' : d.tipo, valor);
        // Un dato de contexto (el municipio) se queda a la vista aunque el detector lo marque.
        if (!esIdentificador(clave)) continue;
        if (!todos[clave]) datos[clave] = valor;
        const inicio = a + bruto.indexOf(valor);
        tramos.push({ inicio, fin: inicio + valor.length, clave });
        // Las demás veces que sale en este texto, aunque el detector no las haya marcado (si no es
        // tan corto que taparía cualquier otra cosa, como la «B» de un piso).
        if (valor.length < 3) continue;
        const igual = new RegExp(BORDE_INI + patronFlexible(valor) + BORDE_FIN, 'giu');
        for (const m of texto.matchAll(igual))
          if (!solapa(m.index, m.index + m[0].length))
            tramos.push({ inicio: m.index, fin: m.index + m[0].length, clave });
      }
    }
    let out = texto;
    for (const t of tramos.filter((x) => x.clave).sort((x, y) => y.inicio - x.inicio))
      out = `${out.slice(0, t.inicio)}{{${t.clave}}}${out.slice(t.fin)}`;
    this.actualizar({ ...this.perfil, ...datos });
    return this.limpiar(out);
  }

  /**
   * En las líneas de controles de una página («[4] campo "Año" = "1988"»), sustituye también las
   * partes de un dato que la app escribió con formato: el día o el año de la fecha, el número del
   * DNI sin la letra. Solo el valor exacto del campo, para no tocar el resto del texto.
   */
  ocultarEnCampos(texto: string): string {
    const pares: [string, string][] = [];
    for (const [clave, valor] of Object.entries(this.perfil)) {
      if (!esIdentificador(clave) || !valor) continue;
      const formatos =
        campoPerfil(clave)?.tipo === 'fecha'
          ? ['', 'iso', 'dia', 'mes', 'anio']
          : clave === 'documento_numero'
            ? ['', 'numero']
            : [''];
      for (const f of formatos) {
        const marcador = f ? `{{${clave}:${f}}}` : `{{${clave}}}`;
        const v = formatear(clave, valor, f || undefined);
        pares.push([v, marcador]);
        if (/^0\d$/.test(v)) pares.push([v.slice(1), marcador]);
      }
    }
    return texto
      .split('\n')
      .map((linea) =>
        /^(⚠ )?\[\d+\] /.test(linea)
          ? pares.reduce((l, [v, m]) => l.replaceAll(`= "${v}"`, `= "${m}"`), linea)
          : linea,
      )
      .join('\n');
  }

  /** Marcadores que aparecen en un texto, para saber si escribirlo exige una web oficial. */
  static marcadores(texto: string): string[] {
    return [...texto.matchAll(MARCADOR)].map((m) => m[1]!);
  }

  /**
   * Sustituye los marcadores por los valores reales. Formatos: `{{fecha_nacimiento}}` (dd/mm/aaaa),
   * `:iso`, `:dia`, `:mes`, `:anio`; `{{documento_numero:numero}}` y `:letra`.
   */
  resolver(texto: string): { texto: string; faltan: string[] } {
    const faltan: string[] = [];
    const out = texto.replace(MARCADOR, (marca, clave: string, formato?: string) => {
      const valor = this.perfil[clave];
      if (!valor) {
        faltan.push(clave);
        return marca;
      }
      return formatear(clave, valor, formato);
    });
    return { texto: out, faltan };
  }
}

/** El marcador de un dato detectado: el mismo si ya se había visto (con otro formato o en Mis datos). */
export function claveDeDato(todos: Perfil, tipo: TipoDato, valor: string): string {
  const n = normalizarValor(valor);
  const previa = Object.entries(todos).find(([, v]) => normalizarValor(v) === n)?.[0];
  if (previa) return previa;
  const usados = Object.keys(todos).flatMap((k) =>
    k.startsWith(`${tipo}_`) ? [Number(k.slice(tipo.length + 1)) || 0] : [],
  );
  return `${tipo}_${Math.max(0, ...usados) + 1}`;
}

function formatear(clave: string, valor: string, formato?: string): string {
  if (campoPerfil(clave)?.tipo === 'fecha') {
    const [y = '', m = '', d = ''] = valor.split('-');
    if (formato === 'iso') return valor;
    if (formato === 'dia') return d;
    if (formato === 'mes') return m;
    if (formato === 'anio') return y;
    return `${d}/${m}/${y}`;
  }
  if (clave === 'documento_numero') {
    const m = /^([XYZ]?\d{7,8})([A-Z])$/i.exec(valor);
    if (m && formato === 'numero') return m[1]!;
    if (m && formato === 'letra') return m[2]!;
  }
  return valor;
}
