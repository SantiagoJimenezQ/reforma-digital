import type { ChatGuard } from '@nationaldesignstudio/rampart';
import { redactQuery } from './redact';
let guard: Promise<ChatGuard> | undefined;
// Browser only. Rejects if Rampart cannot load or run, so nothing is sent unprotected.
export async function protect(text: string): Promise<string> {
  guard ??= import('@nationaldesignstudio/rampart').then((m) => m.createGuard());
  try {
    return (await (await guard).protect(redactQuery(text))).text;
  } catch (e) {
    guard = undefined;
    throw e;
  }
}
