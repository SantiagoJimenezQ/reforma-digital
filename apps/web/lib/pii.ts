import type { ChatGuard } from '@nationaldesignstudio/rampart';
import { redactQuery } from './redact';
let guard: Promise<ChatGuard> | undefined;
export const PROTECTION_TIMEOUT_MS = 60_000;
export class ProtectionTimeoutError extends Error {
  constructor() {
    super(
      'La protección de datos ha tardado demasiado. No se ha enviado la consulta. Inténtalo de nuevo.',
    );
    this.name = 'ProtectionTimeoutError';
  }
}
// Browser only. Rejects if Rampart cannot load or run, so nothing is sent unprotected.
export async function protect(text: string): Promise<string> {
  guard ??= import('@nationaldesignstudio/rampart').then((m) => m.createGuard());
  const current = guard;
  try {
    return (await (await current).protect(redactQuery(text))).text;
  } catch (e) {
    if (guard === current) guard = undefined;
    throw e;
  }
}

// Bound the whole batch, including model loading. Late results never reach fetch.
export async function protectTexts(texts: string[], signal: AbortSignal): Promise<string[]> {
  signal.throwIfAborted();
  const cancellation = new AbortController();
  const workSignal = AbortSignal.any([signal, cancellation.signal]);
  let timer: ReturnType<typeof setTimeout>;
  let abort: () => void;
  const interrupted = new Promise<never>((_, reject) => {
    abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => reject(new ProtectionTimeoutError()), PROTECTION_TIMEOUT_MS);
  });
  const work = (async () => {
    const safe: string[] = [];
    for (const text of texts) {
      workSignal.throwIfAborted();
      safe.push(await protect(text));
    }
    return safe;
  })();
  const current = guard;
  try {
    return await Promise.race([work, interrupted]);
  } catch (error) {
    // A stalled instance must not hold up retries or run concurrently with them.
    if (guard === current) guard = undefined;
    throw error;
  } finally {
    cancellation.abort();
    clearTimeout(timer!);
    signal.removeEventListener('abort', abort!);
  }
}
