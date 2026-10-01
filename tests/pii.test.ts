import { beforeEach, describe, expect, it, vi } from 'vitest';

const createGuard = vi.hoisted(() => vi.fn());
// Path, not package name: Rampart is only a dependency of apps/web.
vi.mock('../apps/web/node_modules/@nationaldesignstudio/rampart', () => ({ createGuard }));

const guard = (protect: (text: string) => Promise<{ text: string }>) => ({ protect });

describe('pii protection', () => {
  beforeEach(() => {
    vi.resetModules();
    createGuard.mockReset();
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
