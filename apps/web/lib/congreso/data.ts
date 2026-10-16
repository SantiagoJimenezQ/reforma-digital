import { cache } from 'react';
import { z } from 'zod';
import { connection } from '@reforma-digital/db';
import {
  indexSchema,
  questionsSchema,
  geographySchema,
  electionsSchema,
  pollsSchema,
  historySchema,
} from './schema';

// Un render solo acepta conjuntos de la misma publicación.
export const publication = cache(async () => {
  const rows =
    await connection()`SELECT publication_id FROM congreso_datasets WHERE path='indice.json'`;
  if (!rows.length) throw new Error('El Congreso todavía no está importado');
  return z.string().parse(rows[0]?.publication_id);
});

// Documentos que una vista usa enteros. Un conjunto no cambia sin cambiar su sha256: la instancia
// conserva la última versión de cada ruta y Postgres solo envía `content` cuando el hash ya no
// coincide. Las vistas que usan una parte la piden con las consultas de `queries.ts`.
// ponytail: caché por instancia (en frío se vuelve a descargar); la Data Cache de Vercel no sirve
// porque descarta objetos de más de 2 MB.
const memory = new Map<string, { sha256: string; content: unknown }>();
const rowSchema = z.object({
  sha256: z.string(),
  publication_id: z.string(),
  content: z.unknown(),
});
export async function dataset(file: string) {
  const known = memory.get(file);
  const rows = await connection()`SELECT sha256, publication_id,
    CASE WHEN sha256 = ${known?.sha256 ?? ''} THEN NULL ELSE content END AS content
    FROM congreso_datasets WHERE path = ${file}`;
  if (!rows.length) return null;
  const row = rowSchema.parse(rows[0]);
  if (known && row.content === null) return { ...row, content: known.content };
  memory.set(file, { sha256: row.sha256, content: row.content });
  return row;
}
const content = cache(async (file: string) => {
  const [row, current] = await Promise.all([dataset(file), publication()]);
  if (row?.publication_id !== current) throw new Error(`Conjunto de datos no importado: ${file}`);
  return row.content;
});
export async function read<T>(file: string, schema: z.ZodType<T>): Promise<T> {
  const result = schema.safeParse(await content(file));
  if (!result.success) throw new Error('El contrato del conjunto de datos no es válido');
  return result.data;
}

export const getIndex = cache(() => read('indice.json', indexSchema));
export const getQuestions = cache(() => read('preguntas.json', questionsSchema));
export const getGeography = cache(() => read('geografia/territorios.json', geographySchema));
export const getElections = cache(() => read('elecciones/elecciones.json', electionsSchema));
export const getPolls = cache(() => read('encuestas/encuestas.json', pollsSchema));
export const getHistory = cache(() => read('elecciones/historico.json', historySchema));

export const slug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
export const deputyName = (value: string) => {
  const [surname = '', name] = value.split(', ');
  return name ? `${name} ${surname}` : surname;
};
export const congressUrl = (exp: string, legislature: string) =>
  `https://www.congreso.es/es/busqueda-de-iniciativas?p_p_id=iniciativas&p_p_lifecycle=0&_iniciativas_mode=mostrarDetalle&_iniciativas_legislatura=${encodeURIComponent(legislature)}&_iniciativas_id=${encodeURIComponent(exp)}`;
