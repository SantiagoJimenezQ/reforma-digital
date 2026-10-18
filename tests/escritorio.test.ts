import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as modelo } from '../apps/web/app/api/escritorio/v1/chat/completions/route';
import { POST as buscar } from '../apps/web/app/api/escritorio/buscar/route';
import { LIMITES } from '../apps/web/lib/escritorio';

/** Las rutas del servidor de la app de escritorio, con NaN Builders y Exa simulados. */
const peticion = (url: string, cuerpo: unknown, instalacion: string | null = randomUUID()) =>
  new Request(`https://reforma-digital.es${url}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(instalacion ? { 'x-rd-instalacion': instalacion } : {}),
    },
    body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  });
const alModelo = (cuerpo: unknown, instalacion?: string | null) =>
  modelo(peticion('/api/escritorio/v1/chat/completions', cuerpo, instalacion));
const mensajes = { messages: [{ role: 'user', content: 'Hola' }] };

/** Una respuesta en streaming de la API de OpenAI, partida en trozos que cortan las líneas. */
function streaming(uso: { prompt_tokens: number; completion_tokens: number }) {
  const sse = [
    `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: 'Hola' } }] })}\n\n`,
    `data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: uso })}\n\n`,
    'data: [DONE]\n\n',
  ].join('');
  const bytes = new TextEncoder().encode(sse);
  return new Response(
    new ReadableStream({
      start(c) {
        for (let i = 0; i < bytes.length; i += 7) c.enqueue(bytes.slice(i, i + 7));
        c.close();
      },
    }),
    { headers: { 'content-type': 'text/event-stream' } },
  );
}

let enviados: { url: string; cuerpo: Record<string, unknown>; auth: string | null }[] = [];
let respuesta: () => Response;

beforeEach(() => {
  enviados = [];
  vi.stubEnv('NAN_API_KEY', 'clave-nan');
  vi.stubEnv('EXA_API_KEY', 'clave-exa');
  vi.stubEnv('ESCRITORIO_USD_MTOK_ENTRADA', '1');
  vi.stubEnv('ESCRITORIO_USD_MTOK_SALIDA', '2');
  vi.stubEnv('DATABASE_URL', '');
  respuesta = () =>
    Response.json({ choices: [], usage: { prompt_tokens: 1, completion_tokens: 1 } });
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    enviados.push({
      url,
      cuerpo: JSON.parse(String(init.body)) as Record<string, unknown>,
      auth: new Headers(init.headers).get('authorization'),
    });
    return respuesta();
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('servidor de la app de escritorio', () => {
  it('pasa a NaN Builders con su clave, su modelo y su máximo, y solo los campos del agente', async () => {
    const r = await alModelo({
      ...mensajes,
      model: 'gpt-caro',
      max_tokens: 1_000_000,
      tools: [{ type: 'function' }],
      user: 'campo-que-no-pasa',
    });
    expect(r.status).toBe(200);
    expect(enviados).toHaveLength(1);
    const { url, cuerpo, auth } = enviados[0]!;
    expect(url).toBe('https://api.nan.builders/v1/chat/completions');
    expect(auth).toBe('Bearer clave-nan');
    expect(cuerpo.model).toBe('deepseek-v4-flash');
    expect(cuerpo.max_tokens).toBe(8192);
    expect(cuerpo.tools).toEqual([{ type: 'function' }]);
    expect(cuerpo).not.toHaveProperty('user');
  });

  it('rechaza sin instalación, con un cuerpo enorme o con una petición que no es del agente', async () => {
    expect((await alModelo(mensajes, null)).status).toBe(400);
    expect((await alModelo(mensajes, 'no-es-un-uuid')).status).toBe(400);
    expect((await alModelo('x'.repeat(2_000_001))).status).toBe(413);
    expect((await alModelo({ messages: [] })).status).toBe(400);
    expect((await alModelo('{')).status).toBe(400);
    expect(enviados).toHaveLength(0);
  });

  it('no pasa nada si faltan la clave o los precios del modelo', async () => {
    vi.stubEnv('ESCRITORIO_USD_MTOK_SALIDA', '');
    expect((await alModelo(mensajes)).status).toBe(503);
    vi.stubEnv('EXA_API_KEY', '');
    expect((await buscar(peticion('/api/escritorio/buscar', { consulta: 'padrón' }))).status).toBe(
      503,
    );
    expect(enviados).toHaveLength(0);
  });

  it('limita las peticiones de cada instalación por hora', async () => {
    const instalacion = randomUUID();
    for (let i = 0; i < LIMITES.modelo; i++)
      expect((await alModelo(mensajes, instalacion)).status).toBe(200);
    expect((await alModelo(mensajes, instalacion)).status).toBe(429);
    // Otra instalación sigue pudiendo.
    expect((await alModelo(mensajes)).status).toBe(200);
  });

  it('deja pasar el streaming tal cual, apunta su gasto y corta al agotar el presupuesto', async () => {
    // Un día propio: el presupuesto no depende de lo que hayan gastado las otras pruebas.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2030-01-01T12:00:00Z'));
    // Cada respuesta cuesta la mitad del presupuesto del día: (prompt × 1 + salida × 2) / 1e6 $.
    const mitad = (LIMITES.usdAlDia / 2) * 1e6;
    respuesta = () => streaming({ prompt_tokens: mitad, completion_tokens: 0 });
    const primera = await alModelo({ ...mensajes, stream: true });
    expect(await primera.text()).toContain('"content":"Hola"');
    expect(enviados[0]!.cuerpo.stream_options).toEqual({ include_usage: true });
    expect(await (await alModelo({ ...mensajes, stream: true })).text()).toContain('[DONE]');
    const agotado = await alModelo({ ...mensajes, stream: true });
    expect(agotado.status).toBe(429);
    expect(enviados).toHaveLength(2);
  });
});
