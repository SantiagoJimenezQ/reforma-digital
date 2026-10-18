import { simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { datosPorReglas, type Detector } from '@reforma-digital/agent';

/** Las reglas del detector de la app, sin el modelo de Rampart Edge (que no está en CI). */
export const detectorDeReglas: Detector = async (t) => datosPorReglas(t);

type Prompt = Parameters<MockLanguageModelV4['doStream']>[0]['prompt'];
type Parte =
  Awaited<ReturnType<MockLanguageModelV4['doStream']>>['stream'] extends ReadableStream<infer T>
    ? T
    : never;
export type Paso = { texto?: string; llamadas?: { herramienta: string; entrada: unknown }[] };

const uso = {
  inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

/** Texto del último resultado de herramienta que ha recibido el modelo (la página, un error…). */
const ultimoResultado = (prompt: Prompt) => {
  const tool = [...prompt].reverse().find((m) => m.role === 'tool');
  const part = tool?.role === 'tool' ? tool.content.at(-1) : undefined;
  return part?.type === 'tool-result' && part.output.type === 'text' ? part.output.value : '';
};

/**
 * Modelo sin coste para probar el arnés de evaluación de punta a punta: cada paso decide qué hace
 * a la vista del último resultado. Acabado el guion, responde «Listo.».
 */
export function modeloGuionado(pasos: ((ultimo: string) => Paso)[]) {
  let i = 0;
  return new MockLanguageModelV4({
    doStream: async ({ prompt }) => {
      const paso = pasos[i++]?.(ultimoResultado(prompt)) ?? { texto: 'Listo.' };
      const chunks: Parte[] = [
        ...(paso.texto
          ? [
              { type: 'text-start' as const, id: 't' },
              { type: 'text-delta' as const, id: 't', delta: paso.texto },
              { type: 'text-end' as const, id: 't' },
            ]
          : []),
        ...(paso.llamadas ?? []).map((l, n) => ({
          type: 'tool-call' as const,
          toolCallId: `c${i}-${n}`,
          toolName: l.herramienta,
          input: JSON.stringify(l.entrada),
        })),
        {
          type: 'finish' as const,
          finishReason: {
            unified: paso.llamadas?.length ? ('tool-calls' as const) : ('stop' as const),
            raw: undefined,
          },
          usage: uso,
        },
      ];
      return { stream: simulateReadableStream({ chunks }) };
    },
  });
}

/** Número del elemento de la página cuyo nombre empieza por `nombre` («[3] campo "DNI/NIE *"»). */
export function ref(pagina: string, nombre: string) {
  const linea = pagina.split('\n').find((l) => l.includes(`"${nombre}`));
  const n = Number(/^\[(\d+)\]/.exec(linea ?? '')?.[1]);
  if (!n) throw new Error(`No hay ningún elemento «${nombre}» en la página:\n${pagina}`);
  return n;
}
