import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import {
  indexSchema,
  schemaForDataset,
  rawQuestionSchema,
  rawSessionSchema,
} from '../lib/congreso/schema';

const argument = process.argv[2];
if (!argument) throw new Error('Indica el directorio de datos');
const directory = resolve(argument);
const index = indexSchema.parse(
  JSON.parse(await readFile(resolve(directory, 'indice.json'), 'utf8')),
);
const files = (await readdir(directory, { recursive: true })).filter((file) =>
  file.endsWith('.json'),
);
for (const file of files) {
  const path = relative(directory, resolve(directory, file));
  const result = schemaForDataset(path).safeParse(
    JSON.parse(await readFile(resolve(directory, file), 'utf8')),
  );
  if (!result.success)
    throw new Error(
      `Contrato inválido: ${path.split('/')[0]} (${result.error.issues.length} errores)`,
    );
}
for (const month of index.meses) {
  if (!files.includes(`${month.mes}.json`)) throw new Error(`Falta el mes ${month.mes}`);
}
console.log(`${files.length} conjuntos JSON validados.`);

const sourceData = process.argv[3];
if (sourceData) {
  const questions = JSON.parse(await readFile(resolve(sourceData, 'preguntas.json'), 'utf8'));
  if (!Array.isArray(questions.preguntas)) throw new Error('Preguntas originales incompatibles');
  for (const question of questions.preguntas) {
    if (!rawQuestionSchema.safeParse(question).success)
      throw new Error('Pregunta original incompatible');
  }
  const sessions = await readdir(resolve(sourceData, 'sesiones'));
  for (const session of sessions.filter((f) => f.endsWith('.json'))) {
    if (
      !rawSessionSchema.safeParse(
        JSON.parse(await readFile(resolve(sourceData, 'sesiones', session), 'utf8')),
      ).success
    )
      throw new Error('Sesión original incompatible');
  }
  console.log('Preguntas y sesiones originales validadas.');
}
