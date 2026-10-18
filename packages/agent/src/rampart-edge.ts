import { readFile } from 'node:fs/promises';
import path from 'node:path';
import * as ort from 'onnxruntime-web';
import { z } from 'zod';

/**
 * Rampart Edge (CC0, National Design Studio): un modelo de 1,45 MB que marca datos personales en
 * un texto. Corre en este ordenador con ONNX Runtime en WebAssembly, sin binarios nativos.
 *
 * Sigue su ficha (huggingface.co/nationaldesignstudio/rampart-edge): tokenizador BERT en
 * minúsculas y sin tildes, ventanas de 384 posiciones con 96 de solape y, en cada token, la
 * etiqueta más probable. El paquete oficial (`@nationaldesignstudio/rampart-edge`) no se usa: sus
 * validadores son de identificadores de EE. UU. (los españoles los cubren las reglas de
 * `profile.ts`) y carga el modelo por URL.
 */
export type TipoEdge =
  | 'NAME'
  | 'ADDRESS'
  | 'EMAIL'
  | 'PHONE'
  | 'GOV_ID'
  | 'FINANCIAL'
  | 'DOB_KEYED'
  | 'URL_HANDLE'
  | 'OTHER_ID';
/** `prob`: la probabilidad media de la etiqueta en sus tokens (para ordenar, no calibrada). */
export type SpanEdge = { inicio: number; fin: number; tipo: TipoEdge; prob: number };
/** Una pieza del tokenizador, con dónde está ella y dónde está la palabra a la que pertenece. */
export type Pieza = { id: number; inicio: number; fin: number; palabra: [number, number] };

const configuracion = z.object({
  span_labels: z.array(z.string()).min(1),
  max_tokens: z.number().int().positive(),
  stride: z.number().int().nonnegative(),
});

/**
 * Lo que BERT trata como palabra suelta: la puntuación, los signos ASCII (`$`, `+`, `<`, `|`…) y
 * cada ideograma chino. Los demás símbolos (emojis, `€`, `½`) van pegados a su palabra.
 */
const SUELTO = /[\p{P}!-/:-@[-`{-~\p{Unified_Ideograph}]/u;
/** BERT da por desconocida una palabra más larga que esto. */
const MAX_PALABRA = 100;

/**
 * Tokenizador WordPiece de BERT (minúsculas, sin tildes) que conserva, para cada pieza, su
 * posición en el texto original: el detector necesita saber qué parte del texto ocultar.
 */
export function tokenizar(texto: string, vocab: ReadonlyMap<string, number>): Pieza[] {
  const desconocido = vocab.get('[UNK]')!;
  // Palabras con su texto normalizado y, para cada carácter normalizado, su posición original.
  const palabras: { t: string; pos: number[]; inicio: number; fin: number }[] = [];
  let actual: (typeof palabras)[number] | null = null;
  for (let i = 0; i < texto.length;) {
    const c = String.fromCodePoint(texto.codePointAt(i)!);
    const siguiente = i + c.length;
    // Los caracteres de control y de formato se quitan sin separar: «a\u200bb» es «ab».
    if (/[\t\n\r\p{Zs}]/u.test(c)) {
      actual = null;
    } else if (!/[\p{Cc}\p{Cf}]/u.test(c)) {
      const n = c
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Mn}/gu, '');
      if (SUELTO.test(c)) {
        palabras.push({ t: n, pos: [...n].map(() => i), inicio: i, fin: siguiente });
        actual = null;
      } else if (n) {
        if (!actual) {
          actual = { t: '', pos: [], inicio: i, fin: i };
          palabras.push(actual);
        }
        for (const _ of n) actual.pos.push(i);
        actual.t += n;
        actual.fin = siguiente;
      }
    }
    i = siguiente;
  }
  const piezas: Pieza[] = [];
  for (const p of palabras) {
    const palabra: [number, number] = [p.inicio, p.fin];
    const letras = [...p.t];
    const fin = (k: number) => {
      const i = p.pos[k]!;
      return i + String.fromCodePoint(texto.codePointAt(i)!).length;
    };
    const sub: Pieza[] = [];
    let desde = 0;
    while (letras.length <= MAX_PALABRA && desde < letras.length) {
      let hasta = letras.length;
      let id: number | undefined;
      // La pieza más larga que esté en el vocabulario; las que siguen a otra llevan «##».
      for (; hasta > desde; hasta--) {
        id = vocab.get((desde ? '##' : '') + letras.slice(desde, hasta).join(''));
        if (id !== undefined) break;
      }
      if (id === undefined) break;
      sub.push({ id, inicio: p.pos[desde]!, fin: fin(hasta - 1), palabra });
      desde = hasta;
    }
    // Si no se puede trocear entera, la palabra es desconocida.
    piezas.push(
      ...(desde === letras.length && sub.length
        ? sub
        : [{ id: desconocido, inicio: p.inicio, fin: p.fin, palabra }]),
    );
  }
  return piezas;
}

/** Carga el modelo de una carpeta local (nunca de internet) y devuelve con qué analizar un texto. */
export async function cargarRampartEdge(carpeta: string) {
  const [modelo, vocabTexto, configTexto] = await Promise.all([
    readFile(path.join(carpeta, 'onnx/model_q4.onnx')),
    readFile(path.join(carpeta, 'vocab.txt'), 'utf8'),
    readFile(path.join(carpeta, 'config.json'), 'utf8'),
  ]);
  const cfg = configuracion.parse(JSON.parse(configTexto));
  const vocab = new Map(vocabTexto.split('\n').map((t, i) => [t.trim(), i]));
  const [cls, sep] = [vocab.get('[CLS]'), vocab.get('[SEP]')];
  if (cls === undefined || sep === undefined || !vocab.has('[UNK]'))
    throw new Error('El vocabulario del detector no es el esperado.');
  // Un hilo: sin workers, que no hacen falta para un modelo tan pequeño.
  ort.env.wasm.numThreads = 1;
  const sesion = await ort.InferenceSession.create(modelo);
  const etiquetas = cfg.span_labels;
  const contenido = cfg.max_tokens - 2;
  const paso = Math.max(1, contenido - cfg.stride);
  const tensor = (valores: number[]) =>
    new ort.Tensor('int64', BigInt64Array.from(valores, BigInt), [1, valores.length]);

  return async (texto: string): Promise<SpanEdge[]> => {
    const piezas = tokenizar(texto, vocab);
    // Cada token se queda con la etiqueta de la ventana en la que está más lejos del borde.
    const elegida = piezas.map(() => ({ etiqueta: 0, prob: 0, margen: -1 }));
    for (let ini = 0; ini < Math.max(piezas.length, 1); ini += paso) {
      const ventana = piezas.slice(ini, ini + contenido);
      const ids = [cls, ...ventana.map((p) => p.id), sep];
      const salida = await sesion.run({
        input_ids: tensor(ids),
        attention_mask: tensor(ids.map(() => 1)),
      });
      const logits = salida.token_logits?.data;
      if (!(logits instanceof Float32Array))
        throw new Error('El detector no ha devuelto etiquetas.');
      ventana.forEach((_, k) => {
        const fila = logits.subarray((k + 1) * etiquetas.length, (k + 2) * etiquetas.length);
        const mayor = Math.max(...fila);
        const total = fila.reduce((s, x) => s + Math.exp(x - mayor), 0);
        const etiqueta = fila.indexOf(mayor);
        const margen = Math.min(k, ventana.length - 1 - k);
        const e = elegida[ini + k]!;
        if (margen > e.margen) Object.assign(e, { etiqueta, prob: 1 / total, margen });
      });
      if (ini + contenido >= piezas.length) break;
    }
    // Tokens seguidos con el mismo tipo (B- y sus I-) son un dato, ampliado a palabras enteras.
    const spans: (SpanEdge & { probs: number[] })[] = [];
    piezas.forEach((p, k) => {
      const etiqueta = etiquetas[elegida[k]!.etiqueta] ?? 'O';
      const previo = spans.at(-1);
      if (etiqueta === 'O') return;
      const tipo = etiqueta.slice(2) as TipoEdge;
      const sigue =
        previo?.tipo === tipo &&
        (etiqueta.startsWith('I-') || previo.fin >= p.palabra[0]) &&
        etiquetas[elegida[k - 1]?.etiqueta ?? 0] !== 'O';
      if (sigue) {
        previo.fin = p.palabra[1];
        previo.probs.push(elegida[k]!.prob);
      } else
        spans.push({
          inicio: p.palabra[0],
          fin: p.palabra[1],
          tipo,
          prob: 0,
          probs: [elegida[k]!.prob],
        });
    });
    return spans.map(({ probs, ...s }) => ({
      ...s,
      prob: probs.reduce((a, b) => a + b, 0) / probs.length,
    }));
  };
}
