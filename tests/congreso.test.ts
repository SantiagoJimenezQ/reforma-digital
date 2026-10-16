import { describe, expect, it } from 'vitest';
import { pollsHidden } from '../apps/web/lib/congreso/polls';
import { congressRoute } from '../apps/web/lib/congreso/routes';
import { monthSchema } from '../apps/web/lib/congreso/schema';
import { generateMetadata } from '../apps/web/app/(search)/congreso/[[...path]]/page';
import sitemap from '../apps/web/app/sitemap';

describe('datos del Congreso', () => {
  it('publica las vistas con canonical propio y las incluye en el sitemap', async () => {
    for (const path of [[], ['diputados'], ['votacion', 'demo']]) {
      const metadata = await generateMetadata({
        params: Promise.resolve({ path }),
        searchParams: Promise.resolve({ q: 'consulta', pagina: '2' }),
      });
      expect(metadata.alternates?.canonical).toBe(
        `/congreso${path.length ? `/${path.join('/')}` : ''}`,
      );
      expect(metadata.robots).toBeUndefined();
    }
    const paths = sitemap().map(({ url }) => new URL(url).pathname);
    expect(paths).toContain('/congreso');
    expect(paths).toContain('/congreso/diputados');
    expect(paths).toContain('/congreso/preguntas');
    expect(paths.some((path) => path.startsWith('/new-'))).toBe(false);
  });
  it('aplica la ventana de encuestas con la hora de Madrid y libera al llegar al final', () => {
    const embargo = ['2026-11-24', '2026-11-29T20:00'];
    expect(pollsHidden(embargo, new Date('2026-11-23T22:59:00Z'))).toBe(false);
    expect(pollsHidden(embargo, new Date('2026-11-23T23:00:00Z'))).toBe(true);
    expect(pollsHidden(embargo, new Date('2026-11-29T18:59:00Z'))).toBe(true);
    expect(pollsHidden(embargo, new Date('2026-11-29T19:00:00Z'))).toBe(false);
  });
  it('rechaza rutas inventadas y fichas sin identificador', () => {
    expect(congressRoute(['nada'])).toBeNull();
    expect(congressRoute(['quien-lo-dijo'])).toBeNull();
    expect(sitemap().some(({ url }) => url.includes('quien-lo-dijo'))).toBe(false);
    expect(congressRoute(['diputado'])).toBeNull();
    expect(congressRoute(['sesion', 'demo', 'extra'])).toBeNull();
    expect(congressRoute(['votacion', 'demo'])?.section).toBe('votacion');
  });
  it('rechaza intervenciones que apuntan a un asunto ausente del conjunto', () => {
    const month = {
      sesiones: [],
      votaciones: [],
      items: ['Asunto sintético'],
      intervenciones: [
        {
          s: 'demo',
          item: 1,
          orador: 'Orador sintético',
          g: 'PP',
          tono: 'técnico',
          int: 1,
          temas: [],
        },
      ],
    };
    expect(monthSchema.safeParse(month).success).toBe(false);
    const intervention = month.intervenciones.at(0);
    if (!intervention) throw new Error('Falta el dato sintético');
    intervention.item = 0;
    expect(monthSchema.safeParse(month).success).toBe(true);
  });
});
