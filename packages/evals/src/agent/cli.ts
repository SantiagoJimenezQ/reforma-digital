import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import type { ConfigProveedor } from '@reforma-digital/agent';
import { evaluar, type Config } from './run';

const { values: v } = parseArgs({
  args: process.argv.slice(2).filter((a) => a !== '--'),
  strict: true,
  options: {
    suite: { type: 'string', default: 'ejecucion' },
    modelo: { type: 'string', default: 'openai/gpt-6-luna' },
    proveedor: {
      type: 'string',
      default: process.env.AI_GATEWAY_API_KEY ? 'gateway' : 'nan',
    },
    razonamiento: { type: 'string' },
    solo: { type: 'string', default: '' },
    concurrencia: { type: 'string', default: '2' },
    juez: { type: 'string', default: 'openai/gpt-6-luna' },
    comparar: { type: 'string' },
  },
});
const tipo = z.enum(['gateway', 'nan']).parse(v.proveedor);
const variable = tipo === 'gateway' ? 'AI_GATEWAY_API_KEY' : 'NAN_API_KEY';
const clave = process.env[variable];
if (!clave) throw new Error(`Falta ${variable}: las evaluaciones del agente usan un modelo real.`);
let proveedor: ConfigProveedor = { tipo: 'gateway', clave, modelo: v.modelo };
if (tipo === 'nan') {
  // Con NaN Builders, las búsquedas las hace Exa.
  const claveExa = process.env.EXA_API_KEY;
  if (!claveExa) throw new Error('Falta EXA_API_KEY: con NaN Builders busca Exa.');
  proveedor = { tipo, clave, claveExa, modelo: v.modelo };
}
const suite = z.enum(['ejecucion', 'investigacion', 'todo']).parse(v.suite);
const cfg: Config = {
  proveedor,
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
