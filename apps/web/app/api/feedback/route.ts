import { z } from 'zod';
import { db, feedback, searches, eq } from '@reforma-digital/db';
import {
  sameOrigin,
  verifyFeedback,
  rateLimit,
  redactQuery,
  databaseAvailable,
} from '../../../lib/security';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Origen no permitido' }, { status: 403 });
  if (!databaseAvailable())
    return Response.json({ error: 'Feedback no disponible sin persistencia.' }, { status: 503 });
  try {
    if (!(await rateLimit(request)))
      return Response.json({ error: 'Espera un minuto' }, { status: 429 });
    const text = await request.text();
    if (text.length > 6000) return Response.json({ error: 'Demasiado largo' }, { status: 413 });
    const parsed = z
      .object({
        searchId: z.string().uuid(),
        token: z.string().length(64),
        rating: z.union([z.literal(1), z.literal(-1)]),
        reason: z.enum(['incorrect', 'source', 'outdated', 'unanswered', 'other']).optional(),
        comment: z.string().max(1000).optional(),
      })
      .safeParse(JSON.parse(text));
    if (!parsed.success) return Response.json({ error: 'Datos inválidos' }, { status: 400 });
    const { token, ...data } = parsed.data;
    if (!verifyFeedback(data.searchId, token))
      return Response.json({ error: 'Referencia inválida' }, { status: 403 });
    const row = (await db().select().from(searches).where(eq(searches.id, data.searchId)))[0];
    if (!row) return Response.json({ error: 'Consulta no encontrada' }, { status: 404 });
    await db()
      .insert(feedback)
      .values({
        ...data,
        comment: data.comment ? redactQuery(data.comment) : null,
      });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'No se ha podido guardar tu valoración' }, { status: 500 });
  }
}
