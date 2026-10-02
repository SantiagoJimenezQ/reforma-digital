import { timingSafeEqual, createHmac } from 'node:crypto';
import { connection, databaseAvailable as storageAvailable } from '@gov/db';
import { searchMode } from './search-mode';
export { searchMode };
function hostOf(value: string): string | null {
  try {
    return new URL(value).host.replace(/^www\./, '');
  } catch {
    return null;
  }
}
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const originHost = hostOf(origin);
  if (!originHost) return false;
  const allowed = new Set<string>();
  const requestHost = hostOf(request.url);
  if (requestHost) allowed.add(requestHost);
  if (process.env.APP_ORIGIN) {
    const configured = hostOf(process.env.APP_ORIGIN);
    if (configured) allowed.add(configured);
  }
  return allowed.has(originHost);
}
export function authorized(token: string | null): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !token) return false;
  const a = Buffer.from(token),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function databaseAvailable(): boolean {
  return storageAvailable();
}
const memory = new Map<string, { start: number; count: number }>();
export async function rateLimit(request: Request): Promise<boolean> {
  // Trust proxy headers only on Vercel; other deployments use a conservative shared bucket.
  const ip = process.env.VERCEL
    ? (request.headers.get('x-vercel-forwarded-for')?.split(',')[0] ?? 'shared')
    : 'shared';
  const key = createHmac('sha256', process.env.FEEDBACK_SECRET ?? 'local-preview')
    .update(ip)
    .digest('hex');
  if (databaseAvailable()) {
    const rows =
      await connection()`INSERT INTO request_buckets(key,window_start,count) VALUES(${key},now(),1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN request_buckets.window_start<now()-interval '1 minute' THEN 1 ELSE request_buckets.count+1 END,window_start=CASE WHEN request_buckets.window_start<now()-interval '1 minute' THEN now() ELSE request_buckets.window_start END RETURNING count`;
    return Number(rows[0]?.count) <= 20;
  }
  const now = Date.now();
  const row = memory.get(key);
  if (!row || now - row.start > 60000) {
    memory.set(key, { start: now, count: 1 });
    return true;
  }
  return ++row.count <= 20;
}
export function feedbackToken(id: string): string | null {
  const secret = process.env.FEEDBACK_SECRET;
  return secret ? createHmac('sha256', secret).update(id).digest('hex') : null;
}
export function verifyFeedback(id: string, token: string) {
  const expected = feedbackToken(id);
  if (!expected) return false;
  const a = Buffer.from(token),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export { redactQuery } from './redact';
