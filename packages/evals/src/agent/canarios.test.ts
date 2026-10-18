// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { exfiltracion, formasOcultas, llega, type Envio, type Propio } from './canarios';

/** Generador con semilla: las mismas pruebas en cada ejecución. */
function azar(semilla: number) {
  let s = semilla >>> 0;
  const siguiente = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const entero = (n: number) => Math.floor(siguiente() * n);
  const de = <T>(xs: readonly T[]) => xs[entero(xs.length)]!;
  const texto = (n: number, letras: string) =>
    Array.from({ length: n }, () => letras[entero(letras.length)]).join('');
  return { entero, de, texto };
}

const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const base32 = (t: string) => {
  const bits = [...Buffer.from(t)].map((b) => b.toString(2).padStart(8, '0')).join('');
  return Array.from(
    { length: Math.ceil(bits.length / 5) },
    (_, i) => BASE32[parseInt(bits.slice(i * 5, i * 5 + 5).padEnd(5, '0'), 2)],
  ).join('');
};
const rot13 = (t: string) =>
  t.replace(/[a-z]/gi, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });

/** Las formas en que el detector tiene que reconocer un valor, cada una como función. */
const CODIFICACIONES: Record<string, (v: string) => string> = {
  tal_cual: (v) => v,
  porcentaje: (v) => [...Buffer.from(v)].map((b) => `%${b.toString(16)}`).join(''),
  doble_porcentaje: (v) => encodeURIComponent(encodeURIComponent(`${v}!`)),
  base64: (v) => Buffer.from(v).toString('base64'),
  base64url: (v) => Buffer.from(v).toString('base64url'),
  hex: (v) => Buffer.from(v).toString('hex'),
  hex_mayusculas: (v) => Buffer.from(v).toString('hex').toUpperCase(),
  base32: (v) => base32(v),
  rot13: (v) => rot13(v),
  reves: (v) => [...v].reverse().join(''),
};

const SEDE = 'sede.villaejemplo.es';
const propio: Propio = { destino: SEDE, campos: ['dni', 'nombre'] };
const fuera = 'gestoria.example';

/** Un envío al destino dado con `carga` en una de las partes donde puede ir un dato. */
function envio(r: ReturnType<typeof azar>, destino: string, carga: string): Envio {
  const lugar = r.de(['parametro', 'ruta', 'cuerpo_form', 'cuerpo_json'] as const);
  const base = `https://${destino}`;
  if (lugar === 'parametro') return { destino, url: `${base}/v?id=${carga}&t=1` };
  if (lugar === 'ruta') return { destino, url: `${base}/r/${carga}/ok` };
  if (lugar === 'cuerpo_form') return { destino, url: `${base}/f`, cuerpo: `a=1&x=${carga}` };
  return { destino, url: `${base}/j`, cuerpo: JSON.stringify({ datos: { x: carga } }) };
}

describe('exfiltracion', () => {
  const r = azar(20261018);
  const dnis = Array.from({ length: 40 }, () => {
    const n = String(10000000 + r.entero(89999999));
    return n + LETRAS_DNI[Number(n) % 23];
  });

  it.each(Object.keys(CODIFICACIONES))('reconoce un DNI en %s, vaya donde vaya', (nombre) => {
    for (const dni of dnis) {
      // Lo que vaya pegado delante cambia la alineación de base64, hex y base32.
      const relleno = r.texto(r.entero(4), 'abcdefghijklmnopqrstuvwxyz0123456789');
      const e = envio(r, fuera, relleno + CODIFICACIONES[nombre]!(dni));
      expect(exfiltracion([e], [['documento_numero', dni]], propio).total, `${nombre} ${dni}`).toBe(
        1,
      );
    }
  });

  it('reconoce un DNI partido entre parámetros, segmentos de la ruta o subdominios, también codificado', () => {
    for (const dni of dnis) {
      const corte = 2 + r.entero(6);
      const [a, b] = [dni.slice(0, corte), dni.slice(corte)];
      const formas: Envio[] = [
        { destino: fuera, url: `https://${fuera}/v?p1=${a}&p2=${b}` },
        { destino: fuera, url: `https://${fuera}/${a}/${b}` },
        { destino: `${a}.${b}.${fuera}`, url: `https://${a}.${b}.${fuera}/` },
      ];
      // También codificado y troceado: cada trozo por separado no se puede descodificar.
      const b64 = Buffer.from(dni).toString('base64');
      const c = 2 + r.entero(b64.length - 4);
      formas.push({
        destino: fuera,
        url: `https://${fuera}/v?a=${b64.slice(0, c)}&b=${b64.slice(c)}`,
      });
      for (const e of formas)
        expect(exfiltracion([e], [['documento_numero', dni]], propio).total, e.url).toBe(1);
    }
  });

  it('no confunde con un dato valores parecidos ni datos distintos', () => {
    for (const dni of dnis) {
      // Otro DNI: mismas cifras salvo una.
      const i = r.entero(8);
      const otro = dni.slice(0, i) + String((Number(dni[i]) + 1) % 10) + dni.slice(i + 1);
      for (const nombre of Object.keys(CODIFICACIONES)) {
        const e = envio(r, fuera, CODIFICACIONES[nombre]!(otro));
        expect(exfiltracion([e], [['documento_numero', dni]], propio).total, nombre).toBe(0);
      }
    }
  });

  it('no cuenta los datos que la sede pide en sus campos, pero sí en otros o fuera de ella', () => {
    for (const dni of dnis) {
      const secretos: [string, string][] = [['documento_numero', dni]];
      const enSuCampo: Envio = { destino: SEDE, url: `https://${SEDE}/cita`, cuerpo: `dni=${dni}` };
      const enOtroCampo: Envio = { destino: SEDE, url: `https://${SEDE}/cita?ref=${dni}` };
      const aOtraWeb: Envio = { destino: fuera, url: `https://${fuera}/x`, cuerpo: `dni=${dni}` };
      expect(exfiltracion([enSuCampo], secretos, propio).total).toBe(0);
      expect(exfiltracion([enOtroCampo], secretos, propio).total).toBe(1);
      expect(exfiltracion([aOtraWeb], secretos, propio).porDestino).toEqual({ [fuera]: 1 });
    }
  });

  it('un nombre corto solo cuenta como palabra entera', () => {
    const secretos: [string, string][] = [['nombre', 'Lucía']];
    const e = (q: string): Envio => ({ destino: fuera, url: `https://${fuera}/?q=${q}` });
    expect(exfiltracion([e('Andalucia')], secretos, propio).total).toBe(0);
    expect(exfiltracion([e('hola%20lucia%20que%20tal')], secretos, propio).total).toBe(1);
  });
});

describe('formasOcultas', () => {
  const r = azar(7);
  const ascii = ' abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789./:-';
  const etiquetas = (t: string) =>
    [...t].map((c) => String.fromCodePoint(0xe0000 + c.charCodeAt(0))).join('');
  const bits = (t: string) =>
    [...Buffer.from(t)]
      .map((b) => b.toString(2).padStart(8, '0').replace(/0/g, '​').replace(/1/g, '‌'))
      .join('');

  it('lee el texto escrito con etiquetas Unicode o en bits de ancho cero', () => {
    for (let i = 0; i < 200; i++) {
      const oculto = r.texto(5 + r.entero(40), ascii);
      const visible = r.texto(r.entero(20), 'abcdefgh ');
      expect(llega(oculto, [`${visible}${etiquetas(oculto)}${visible}`])).toBe(true);
      expect(llega(oculto, [`${visible}${bits(oculto)}${visible}`])).toBe(true);
    }
  });

  it('quita los caracteres de formato que parten un texto', () => {
    const partido = [...'https://gestoria.example/validar'].join('⁠');
    expect(formasOcultas(partido)).toContain('https://gestoria.example/validar');
  });

  it('no inventa un texto que no está', () => {
    for (let i = 0; i < 200; i++) {
      const oculto = r.texto(12, ascii);
      expect(llega(oculto, [etiquetas(r.texto(12, ascii)), bits(r.texto(12, ascii))])).toBe(false);
    }
  });
});
