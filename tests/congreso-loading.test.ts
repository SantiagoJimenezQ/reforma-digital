import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToReadableStream } from 'react-dom/server';
import Page from '../apps/web/app/(search)/congreso/[[...path]]/page';
import { indexSchema } from '../apps/web/lib/congreso/schema';

const data = vi.hoisted(() => ({ getIndex: vi.fn(), getPeriod: vi.fn() }));
vi.mock('../apps/web/lib/congreso/data', async (original) => ({
  ...(await original<typeof import('../apps/web/lib/congreso/data')>()),
  ...data,
}));

const index = indexSchema.parse({
  meta: {
    generado: '2026-10-13',
    datos_hasta: '2026-10-12',
    legislatura: 'XV',
    periodo: 'reciente',
  },
  grupos: {},
  diputados: [],
  meses: [],
  hemiciclo: { ancho: 300, alto: 180 },
  agenda: { plenos: [] },
});

beforeEach(() => {
  data.getIndex.mockReset();
  data.getPeriod
    .mockReset()
    .mockResolvedValue({ sesiones: [], votaciones: [], intervenciones: [] });
});

describe('carga del Congreso', () => {
  it.each([
    ['glosario', 'Glosario'],
    ['como-ley', 'Cómo se hace una ley'],
    ['metodo', 'Método'],
    ['sobre', 'Sobre los datos'],
    ['elecciones/escano', 'Cómo se reparte un escaño'],
  ])('muestra %s aunque los datos no estén disponibles', async (path, title) => {
    data.getIndex.mockRejectedValue(new Error('Datos no disponibles'));
    const page = await Page({
      params: Promise.resolve({ path: path.split('/') }),
      searchParams: Promise.resolve({}),
    });
    const html = await new Response(await renderToReadableStream(page)).text();
    expect(html).toContain(title);
    expect(html).not.toContain('Cargando datos');
    expect(data.getIndex).not.toHaveBeenCalled();
    expect(data.getPeriod).not.toHaveBeenCalled();
  });

  it.each([
    [[], 'Lo que pasa en el Congreso, contado para cualquiera.'],
    [['votaciones'], 'Cada voto, a la vista'],
  ])('envía el contenido estático de %s mientras espera los datos', async (path, title) => {
    const pending = Promise.withResolvers<typeof index>();
    data.getIndex.mockReturnValue(pending.promise);
    const page = await Page({
      params: Promise.resolve({ path }),
      searchParams: Promise.resolve({}),
    });
    const reader = (await renderToReadableStream(page)).getReader();
    try {
      let html = '';
      while (!html.includes('Cargando datos del Congreso')) {
        const chunk = await reader.read();
        if (chunk.done) throw new Error('No se emitió el contenido antes de resolver los datos');
        html += new TextDecoder().decode(chunk.value);
      }
      expect(html).toContain(title);
      expect(html).toContain('Cargando datos del Congreso');
      expect(html).not.toContain('Snapshot generado');
    } finally {
      pending.resolve(index);
    }
    let rest = '';
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      rest += new TextDecoder().decode(chunk.value);
    }
    expect(rest).toContain('Snapshot generado');
  });
});
