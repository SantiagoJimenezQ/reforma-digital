import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { evaluar, type Config } from './run';

const { values: v } = parseArgs({
  args: process.argv.slice(2).filter((a) => a !== '--'),
  strict: true,
  options: {
    suite: { type: 'string', default: 'ejecucion' },
    modelo: { type: 'string', default: 'openai/gpt-6-luna' },
    proveedor: {
      type: 'string',
      default: process.env.AI_GATEWAY_API_KEY ? 'gateway' : 'openrouter',
    },
    razonamiento: { type: 'string' },
    solo: { type: 'string', default: '' },
    concurrencia: { type: 'string', default: '2' },
    juez: { type: 'string', default: 'openai/gpt-6-luna' },
    comparar: { type: 'string' },
  },
});
const tipo = z.enum(['gateway', 'openrouter']).parse(v.proveedor);
const clave = tipo === 'gateway' ? process.env.AI_GATEWAY_API_KEY : process.env.OPENROUTER_API_KEY;
if (!clave)
  throw new Error(
    `Falta ${tipo === 'gateway' ? 'AI_GATEWAY_API_KEY' : 'OPENROUTER_API_KEY'}: las evaluaciones del agente usan un modelo real.`,
  );
const suite = z.enum(['ejecucion', 'investigacion', 'todo']).parse(v.suite);
const cfg: Config = {
  proveedor: { tipo, clave, modelo: v.modelo },
  juez: v.juez,
  razonamiento: z
    .enum(['none', 'minimal', 'low', 'medium', 'high'])
    .optional()
    .parse(v.razonamiento),
};
const solo = v.solo.split(',').filter(Boolean);
const { informe, archivo } = await evaluar({
  suite,
  solo,
  concurrencia: Math.min(4, Math.max(1, Number(v.concurrencia) || 2)),
  cfg,
});
console.log('\n' + JSON.stringify(informe.resumen, null, 2));
const comparar = v.comparar;
if (comparar) {
  const previo = JSON.parse(await readFile(comparar, 'utf8')) as typeof informe;
  const delta: Record<string, Record<string, string>> = {};
  for (const [suiteNombre, metricas] of Object.entries(informe.resumen))
    for (const [k, v] of Object.entries(metricas as Record<string, unknown>)) {
      const antes = (previo.resumen as Record<string, Record<string, unknown> | undefined>)[
        suiteNombre
      ]?.[k];
      if (typeof v === 'number' && typeof antes === 'number' && v !== antes)
        (delta[suiteNombre] ??= {})[k] = `${antes} → ${v}`;
    }
  console.log(`\nFrente a ${previo.modelo} (${previo.id}):\n` + JSON.stringify(delta, null, 2));
}
console.log(`\nInforme: ${archivo}`);
