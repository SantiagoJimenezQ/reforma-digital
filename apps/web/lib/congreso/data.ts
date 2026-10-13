import { cache } from 'react';
import { z } from 'zod';
import { connection } from '@reforma-digital/db';
import {
  indexSchema,
  monthSchema,
  lawsSchema,
  questionsSchema,
  organsSchema,
  weeksSchema,
  geographySchema,
  electionsSchema,
  pollsSchema,
  historySchema,
} from './schema';

// Un render solo acepta conjuntos de la misma publicación.
const publication = cache(async () => {
  const rows =
    await connection()`SELECT publication_id FROM congreso_datasets WHERE path='indice.json'`;
  if (!rows.length) throw new Error('El Congreso todavía no está importado');
  return z.string().parse(rows[0]?.publication_id);
});
export async function read<T>(file: string, schema: z.ZodType<T>): Promise<T> {
  const rows =
    await connection()`SELECT content FROM congreso_datasets WHERE path = ${file} AND publication_id=${await publication()}`;
  if (!rows.length) throw new Error(`Conjunto de datos no importado: ${file}`);
  const result = schema.safeParse(rows[0]?.content);
  if (!result.success) throw new Error('El contrato del conjunto de datos no es válido');
  return result.data;
}

export const getIndex = cache(() => read('indice.json', indexSchema));
export const getLaws = cache(() => read('leyes.json', lawsSchema));
export const getQuestions = cache(() => read('preguntas.json', questionsSchema));
export const getOrgans = cache(() => read('organigrama.json', organsSchema));
export const getWeeks = cache(() => read('semanas.json', weeksSchema));
export const getGeography = cache(() => read('geografia/territorios.json', geographySchema));
export const getElections = cache(() => read('elecciones/elecciones.json', electionsSchema));
export const getPolls = cache(() => read('encuestas/encuestas.json', pollsSchema));
export const getHistory = cache(() => read('elecciones/historico.json', historySchema));

export const getPeriod = cache(async (period: string) => {
  const index = await getIndex();
  const months = index.meses.map(({ mes }) => mes).sort();
  if (period !== 'todo' && period !== 'reciente' && !months.includes(period))
    throw new Error('Periodo desconocido');
  const selected = period === 'todo' ? months : period === 'reciente' ? months.slice(-3) : [period];
  const data = await Promise.all(selected.map((month) => read(`${month}.json`, monthSchema)));
  return {
    sesiones: data
      .flatMap((month) => month.sesiones)
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    votaciones: data
      .flatMap((month) => month.votaciones)
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    intervenciones: data.flatMap((month) =>
      month.intervenciones.map((intervention) => ({
        ...intervention,
        item:
          typeof intervention.item === 'number'
            ? z.string().parse(month.items?.[intervention.item])
            : intervention.item,
      })),
    ),
  };
});

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
