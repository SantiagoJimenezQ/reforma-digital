import { describe, expect, it, vi } from 'vitest';

// Postgres sintético: un único conjunto cuya publicación y hash se pueden cambiar.
const state = { publication: 'p1', sha256: 'a', content: { valor: 1 }, sent: 0 };
vi.mock('../packages/db/src/index.ts', () => ({
  connection: () => (strings: TemplateStringsArray, known?: string) => {
    if (!strings.join('').includes('CASE')) return [{ publication_id: state.publication }];
    const unchanged = known === state.sha256;
    if (!unchanged) state.sent++;
    return [
      {
        sha256: state.sha256,
        publication_id: state.publication,
        content: unchanged ? null : state.content,
      },
    ];
  },
}));
const { read } = await import('../apps/web/lib/congreso/data');
const { jsonSchema: schema } = await import('../apps/web/lib/congreso/schema');

describe('lectura de conjuntos del Congreso', () => {
  it('solo descarga el contenido cuando cambia su hash', async () => {
    expect(await read('demo.json', schema)).toEqual({ valor: 1 });
    expect(await read('demo.json', schema)).toEqual({ valor: 1 });
    expect(state.sent).toBe(1);
    Object.assign(state, { sha256: 'b', content: { valor: 2 } });
    expect(await read('demo.json', schema)).toEqual({ valor: 2 });
    expect(state.sent).toBe(2);
  });
});
