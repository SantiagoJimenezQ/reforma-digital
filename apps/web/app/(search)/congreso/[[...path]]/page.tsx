import { Icon } from '../../../../components/sol/icon';
import { Button, Surface, Select } from '@reforma-digital/design/sol';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { getIndex, getPeriod } from '../../../../lib/congreso/data';
import { congressBase, congressRoute } from '../../../../lib/congreso/routes';
import { pageMetadata } from '../../../../lib/seo';
import {
  Intro,
  Section,
  Stats,
  Sessions,
  Votes,
  Hemicycle,
  Empty,
  Source,
  date,
  href,
} from '../../../../components/congreso/common';
import { Activity } from '../../../../components/congreso/activity';
import { People } from '../../../../components/congreso/people';
import { Explore } from '../../../../components/congreso/explore';
import { Geography, Elections } from '../../../../components/congreso/elections';
import { Information } from '../../../../components/congreso/information';
import { StaticIntro } from '../../../../components/congreso/intro';
import { DataLoading } from '../../../../components/congreso/loading';

type Props = {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path = [] } = await params;
  const route = congressRoute(path);
  if (!route) notFound();
  return pageMetadata({
    title: `${route.title} · El Congreso · Reforma Digital`,
    description:
      'Qué se dijo, cómo se votó y quién te representa. Actividad parlamentaria con datos oficiales, fuentes y análisis identificados como IA.',
    path: href(path.map(encodeURIComponent).join('/')),
    og: 'portada',
  });
}
const querySchema = z.object({
  q: z.string().max(200).default(''),
  grupo: z.string().max(30).default(''),
  provincia: z.string().max(80).default(''),
  periodo: z.string().max(10).default('reciente'),
  pagina: z.coerce.number().int().min(1).max(100000).default(1),
  vista: z.string().max(30).default('citas'),
});
export default async function Page({ params, searchParams }: Props) {
  const route = congressRoute((await params).path);
  if (!route) notFound();
  const parsed = querySchema.safeParse(await searchParams);
  if (!parsed.success) notFound();
  const { section, detail } = route;
  const information = ['sobre', 'metodo', 'glosario', 'como-ley'].includes(section);
  return (
    <main id="main" tabIndex={-1}>
      {section === '' && (
        <section className="cg-hero">
          <span className="t-etiqueta">Un proyecto de Reforma Digital</span>
          <h1>Lo que pasa en el Congreso, contado para cualquiera.</h1>
          <p>
            Cada pleno resumido, cada votación con el voto de cada diputado y cada ley, desde que
            entra hasta que se publica. Con datos oficiales, en lenguaje claro y con código abierto.
          </p>
          <Button href="#lo-ultimo" variant="secondary">
            Lo último del Congreso ↓
          </Button>
        </section>
      )}
      <div className="cg-body">
        {information ? (
          <Information section={section} title={route.title} />
        ) : section === 'elecciones' && detail === 'escano' ? (
          <Elections detail={detail} query={parsed.data.q} page={parsed.data.pagina} />
        ) : (
          <>
            <StaticIntro section={section} detail={detail} province={parsed.data.provincia} />
            <Suspense
              key={`${section}/${detail ?? ''}/${JSON.stringify(parsed.data)}`}
              fallback={<DataLoading />}
            >
              <Data route={route} query={parsed.data} />
            </Suspense>
          </>
        )}
      </div>
    </main>
  );
}

async function Data({
  route,
  query,
}: {
  route: NonNullable<ReturnType<typeof congressRoute>>;
  query: z.infer<typeof querySchema>;
}) {
  const { q, grupo, provincia, periodo, pagina, vista } = query;

  const index = await getIndex();
  if (!['reciente', 'todo', ...index.meses.map((m) => m.mes)].includes(periodo)) notFound();
  const { section, detail } = route;
  let content;
  if (
    [
      'dias',
      'votaciones',
      'votacion',
      'sesion',
      'leyes',
      'iniciativa',
      'temas',
      'tema',
      'preguntas',
    ].includes(section)
  ) {
    content = (
      <Activity
        section={section}
        detail={detail}
        index={index}
        period={periodo}
        query={q}
        page={pagina}
      />
    );
  } else if (
    ['diputados', 'diputado', 'grupos', 'oradores', 'organigrama', 'cargo', 'provincia'].includes(
      section,
    )
  ) {
    content = (
      <People
        section={section}
        detail={detail}
        index={index}
        period={periodo}
        query={q}
        group={grupo}
        province={provincia}
        page={pagina}
      />
    );
  } else if (['explora', 'semana'].includes(section)) {
    content = <Explore section={section} detail={detail} query={q} page={pagina} tab={vista} />;
  } else if (section === 'geografia')
    content = <Geography detail={detail} query={q} page={pagina} />;
  else if (section === 'elecciones')
    content = <Elections detail={detail} query={q} page={pagina} />;
  else {
    const data = await getPeriod(periodo);
    content = (
      <>
        <div id="lo-ultimo">
          <Intro
            label={`Legislatura ${index.meta.legislatura} · datos hasta ${date(index.meta.datos_hasta)}`}
            title="Lo último del Congreso"
            heading="h2"
          >
            <p>Qué se dijo, cómo se votó y quién te representa.</p>
          </Intro>
        </div>
        <Stats
          items={[
            [data.sesiones.length, 'Sesiones'],
            [data.votaciones.length, 'Votaciones'],
            [data.intervenciones.length, 'Intervenciones analizadas'],
          ]}
        />
        <Section
          title="Cada escaño, a la vista"
          action={<Link href={href('diputados')}>Quién te representa →</Link>}
        >
          <Hemicycle index={index} />
        </Section>
        <Section
          title="Las últimas sesiones"
          action={<Link href={href('dias', periodo)}>Ver todas →</Link>}
        >
          <Sessions sessions={data.sesiones.slice(0, 6)} />
        </Section>
        <Section
          title="Así se votó"
          action={<Link href={href('votaciones', periodo)}>Ver todas →</Link>}
        >
          <Votes votes={data.votaciones.slice(0, 6)} />
        </Section>
        <Section title="Próximos plenos">
          {index.agenda.plenos.length ? (
            <div className="cg-grid">
              {index.agenda.plenos.map((pleno) => (
                <Surface asChild key={pleno.fecha}>
                  <article className="cg-card">
                    <h3>{date(pleno.fecha)}</h3>
                    <ul>
                      {pleno.puntos.map((p, i) => (
                        <li key={i}>{p.titulo}</li>
                      ))}
                    </ul>
                  </article>
                </Surface>
              ))}
            </div>
          ) : (
            <Empty>No hay plenos convocados en el último registro.</Empty>
          )}
        </Section>
      </>
    );
  }
  return (
    <>
      {['', 'dias', 'votaciones', 'diputado', 'grupos', 'oradores'].includes(section) && (
        <form
          className="cg-period"
          action={`${congressBase}/${section}${detail ? `/${detail}` : ''}`}
        >
          <label htmlFor="congress-period">Periodo</label>
          <Select
            id="congress-period"
            name="periodo"
            label="Periodo"
            defaultValue={periodo}
            options={[
              { value: 'reciente', label: 'Últimos tres meses' },
              { value: 'todo', label: 'Toda la legislatura' },
              ...index.meses
                .slice()
                .reverse()
                .map((m) => ({ value: m.mes, label: m.mes })),
            ]}
            icon={<Icon name="abajo" size={16} />}
            selectedIcon={<Icon name="hecho" size={16} />}
          />
          <Button type="submit" variant="secondary">
            Aplicar
          </Button>
        </form>
      )}
      {content}
      <p className="cg-provenance">
        Snapshot generado el {date(index.meta.generado)}. Los distintos conjuntos pueden tener
        fechas de actualización diferentes. <Link href={href('metodo')}>Método y fuentes</Link>.
      </p>
    </>
  );
}
