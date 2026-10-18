import { z } from 'zod';
import { apuntarGasto, leerCuerpo, rechazo } from '../../../../../../lib/escritorio';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * El modelo de la app de escritorio, con la API de OpenAI: pasa las peticiones a NaN Builders con
 * la clave del servidor. El modelo y el máximo de tokens los pone el servidor, y solo pasan los
 * campos que usa el agente. Las peticiones ya llegan sin datos personales (van como marcadores) y
 * no se guardan: solo se cuentan.
 */
const NAN = 'https://api.nan.builders/v1/chat/completions';
const MODELO = 'deepseek-v4-flash';
const MAX_BYTES = 2_000_000;
const MAX_TOKENS = 8192;

const peticionEsquema = z.object({
  messages: z.array(z.unknown()).min(1).max(500),
  tools: z.array(z.unknown()).max(64).optional(),
  tool_choice: z.unknown().optional(),
  stream: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
  reasoning_effort: z.enum(['none', 'minimal', 'low', 'medium', 'high']).optional(),
  parallel_tool_calls: z.boolean().optional(),
});

const usoEsquema = z.object({ prompt_tokens: z.number(), completion_tokens: z.number() });

/** Precio del modelo en dólares por millón de tokens, del panel de NaN Builders. */
function precios() {
  const entrada = Number(process.env.ESCRITORIO_USD_MTOK_ENTRADA);
  const salida = Number(process.env.ESCRITORIO_USD_MTOK_SALIDA);
  return entrada > 0 && salida > 0 ? { entrada, salida } : null;
}

/** Deja pasar la respuesta en streaming tal cual y apunta lo que ha costado al terminar. */
function contarUso(apuntar: (uso: unknown) => Promise<void>) {
  const texto = new TextDecoder();
  let pendiente = '';
  let uso: unknown;
  const leer = (linea: string) => {
    if (!linea.startsWith('data: {')) return;
    try {
      const datos = JSON.parse(linea.slice(6)) as { usage?: unknown };
      if (datos.usage) uso = datos.usage;
    } catch {
      // Una línea que no es JSON no tiene el uso.
    }
  };
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(trozo, salida) {
      salida.enqueue(trozo);
      const lineas = (pendiente + texto.decode(trozo, { stream: true })).split('\n');
      pendiente = lineas.pop() ?? '';
      lineas.forEach(leer);
    },
    async flush() {
      leer(pendiente);
      await apuntar(uso);
    },
  });
}

export async function POST(request: Request) {
  const clave = process.env.NAN_API_KEY;
  const precio = precios();
  // Sin precios no se puede vigilar el presupuesto: no se pasa nada.
  if (!clave || !precio)
    return Response.json(
      { error: 'El servidor del asistente no está configurado.' },
      { status: 503 },
    );
  const parada = await rechazo(request, 'modelo');
  if (parada) return parada;
  const texto = await leerCuerpo(request, MAX_BYTES);
  if (texto === null) return Response.json({ error: 'Petición demasiado grande' }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const p = peticionEsquema.safeParse(json);
  if (!p.success) return Response.json({ error: 'Petición no válida' }, { status: 400 });
  const res = await fetch(NAN, {
    method: 'POST',
    headers: { authorization: `Bearer ${clave}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      ...p.data,
      model: MODELO,
      max_tokens: Math.min(p.data.max_tokens ?? MAX_TOKENS, MAX_TOKENS),
      ...(p.data.stream ? { stream_options: { include_usage: true } } : {}),
    }),
    signal: request.signal,
  });
  const apuntar = async (uso: unknown) => {
    const u = usoEsquema.safeParse(uso);
    if (u.success)
      await apuntarGasto(
        (u.data.prompt_tokens * precio.entrada + u.data.completion_tokens * precio.salida) / 1e6,
      );
  };
  const tipo = res.headers.get('content-type') ?? 'application/json';
  if (!res.ok || !res.body || !p.data.stream) {
    const cuerpo = await res.text();
    if (res.ok) {
      try {
        await apuntar((JSON.parse(cuerpo) as { usage?: unknown }).usage);
      } catch {
        // Sin uso que leer no hay gasto que apuntar.
      }
    }
    return new Response(cuerpo, { status: res.status, headers: { 'content-type': tipo } });
  }
  return new Response(res.body.pipeThrough(contarUso(apuntar)), {
    headers: { 'content-type': tipo, 'cache-control': 'no-store' },
  });
}
