import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createGuard = vi.hoisted(() => vi.fn());
// Path, not package name: Rampart is only a dependency of apps/web.
vi.mock('../apps/web/node_modules/@nationaldesignstudio/rampart', () => ({ createGuard }));

const guard = (protect: (text: string) => Promise<{ text: string }>) => ({ protect });

describe('pii protection', () => {
  beforeEach(() => {
    vi.resetModules();
    createGuard.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('cancels a pending model load immediately and allows retry', async () => {
    let finish!: (value: unknown) => void;
    createGuard.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { protectTexts } = await import('../apps/web/lib/pii');
    const controller = new AbortController();
    const pending = protectTexts(['Soy Ana', 'segunda pregunta'], controller.signal);
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(createGuard).toHaveBeenCalledOnce());
    controller.abort();
    await rejected;
    const oldProtect = vi.fn(async (text: string) => ({ text }));
    createGuard.mockResolvedValue(guard(async (text) => ({ text })));
    expect(await protectTexts(['Otra pregunta'], new AbortController().signal)).toEqual([
      'Otra pregunta',
    ]);
    finish(guard(oldProtect));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(oldProtect).toHaveBeenCalledTimes(1);
  });

  it('bounds the whole batch and discards a late inference without starting the next text', async () => {
    let finish!: (value: { text: string }) => void;
    const inference = vi.fn(
      () =>
        new Promise<{ text: string }>((resolve) => {
          finish = resolve;
        }),
    );
    createGuard.mockResolvedValue(guard(inference));
    const { protectTexts, PROTECTION_TIMEOUT_MS } = await import('../apps/web/lib/pii');
    vi.useFakeTimers();
    const pending = protectTexts(
      ['Primera pregunta', 'segunda pregunta'],
      new AbortController().signal,
    );
    const rejected = expect(pending).rejects.toMatchObject({ name: 'ProtectionTimeoutError' });
    await vi.advanceTimersByTimeAsync(PROTECTION_TIMEOUT_MS);
    await rejected;
    finish({ text: 'late result' });
    await vi.advanceTimersByTimeAsync(0);
    expect(inference).toHaveBeenCalledTimes(1);
    createGuard.mockResolvedValue(guard(async (text) => ({ text })));
    expect(await protectTexts(['Reintento'], new AbortController().signal)).toEqual(['Reintento']);
  });

  it('never initializes protection for an already cancelled request', async () => {
    const { protectTexts } = await import('../apps/web/lib/pii');
    const controller = new AbortController();
    controller.abort();
    await expect(protectTexts(['Pregunta'], controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(createGuard).not.toHaveBeenCalled();
  });

  it('hands Rampart text that the Spanish rules already redacted', async () => {
    const seen: string[] = [];
    createGuard.mockResolvedValue(
      guard(async (text) => {
        seen.push(text);
        return { text: text.replace('Ana', '[GIVEN_NAME_1]') };
      }),
    );
    const { protect } = await import('../apps/web/lib/pii');
    expect(await protect('Soy Ana, DNI 12345678Z')).toBe('Soy [GIVEN_NAME_1], DNI [DNI omitido]');
    expect(seen).toEqual(['Soy Ana, DNI [DNI omitido]']);
  });

  it('fails closed when Rampart cannot load, then retries', async () => {
    createGuard.mockRejectedValueOnce(new Error('model unavailable'));
    createGuard.mockResolvedValue(guard(async (text) => ({ text })));
    const { protect } = await import('../apps/web/lib/pii');
    await expect(protect('Soy Ana')).rejects.toThrow('model unavailable');
    expect(await protect('Soy Ana')).toBe('Soy Ana');
  });

  it('fails closed when Rampart throws while protecting', async () => {
    createGuard.mockResolvedValue(
      guard(async () => {
        throw new Error('inference failed');
      }),
    );
    const { protect } = await import('../apps/web/lib/pii');
    await expect(protect('Soy Ana')).rejects.toThrow('inference failed');
  });
});
