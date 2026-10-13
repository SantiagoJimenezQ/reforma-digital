import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { getIndex, getPeriod, getQuiz } from '../../../../../lib/congreso/data';
import { congressBase, congressRoute } from '../../../../../lib/congreso/routes';
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
} from '../../../../../components/congreso/common';
import { Activity } from '../../../../../components/congreso/activity';
import { People } from '../../../../../components/congreso/people';
import { Explore } from '../../../../../components/congreso/explore';
import { Geography, Elections } from '../../../../../components/congreso/elections';
import { Quiz } from '../../../../../components/congreso/quiz';

type Props = {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const route = congressRoute((await params).path);
  return {
    title: `${route?.title || 'El Congreso'} · Reforma Digital`,
    robots: { index: false, follow: false },
  };
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
  const { q, grupo, provincia, periodo, pagina, vista } = parsed.data;
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
  else if (section === 'quien-lo-dijo') {
    const quizzes = await getQuiz();
    const days = Object.keys(quizzes).sort();
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(
      new Date(),
    );
    const day = days.filter((d) => d <= today).at(-1);
    const rounds = day && quizzes[day];
    content = (
      <>
        <Intro title="¿Quién lo dijo?">
          <p>Una cita del Congreso. Adivina el grupo y después consulta el contexto.</p>
        </Intro>
        {rounds ? <Quiz rounds={rounds} /> : <Empty>No hay un reto publicado para hoy.</Empty>}
      </>
    );
  } else if (['sobre', 'metodo', 'glosario', 'como-ley'].includes(section)) {
    const terms = [
      ['Pleno', 'La reunión de todos los diputados. Debate, vota y controla al Gobierno.'],
      [
        'Comisión',
        'Un grupo de diputados que trabaja sobre una materia y prepara decisiones del Pleno.',
      ],
      [
        'Proposición de ley',
        'Una iniciativa legislativa presentada por quienes tienen esa facultad, como los grupos parlamentarios.',
      ],
      ['Proyecto de ley', 'Una iniciativa legislativa que presenta el Gobierno.'],
      [
        'Real decreto-ley',
        'Una norma del Gobierno para circunstancias de extraordinaria y urgente necesidad, sujeta a convalidación en el Congreso.',
      ],
      ['Abstención', 'El diputado participa en la votación sin votar a favor ni en contra.'],
      ['No vota', 'La fuente no registra voto; no permite concluir por sí sola la causa.'],
    ];
    content = (
      <>
        <Intro title={route.title} />
        {section === 'glosario' ? (
          <dl className="cg-glossary">
            {terms.map(([term, definition]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{definition}</dd>
              </div>
            ))}
          </dl>
        ) : section === 'como-ley' ? (
          <>
            <ol className="cg-timeline">
              {[
                'Presentación y admisión a trámite',
                'Debate y enmiendas en el Congreso',
                'Aprobación y remisión al Senado',
                'Decisión final del Congreso cuando corresponde',
                'Sanción, promulgación y publicación en el BOE',
              ].map((step) => (
                <li key={step}>
                  <h2>{step}</h2>
                </li>
              ))}
            </ol>
            <p>
              El recorrido varía según el tipo de iniciativa. Cada ficha enlaza su expediente para
              consultar el procedimiento completo.
            </p>
            <Source url="https://www.congreso.es/es/funciones">Funciones del Congreso</Source>
          </>
        ) : (
          <>
            <Section title="Datos públicos, con contexto">
              <p>
                Votaciones, Diarios de Sesiones, diputados, iniciativas, preguntas, agenda e
                intereses proceden del Congreso. Los nombramientos y ceses proceden del BOE; la
                geografía usa datos del INE. Cada ficha conserva enlaces a las fuentes.
              </p>
              <p>
                Los resúmenes, tonos, temas y agrupaciones se generan con IA y pueden contener
                errores. Las citas se contrastan con el texto extraído del Diario. La transcripción
                también puede contener errores: el PDF oficial es la referencia.
              </p>
              <p>
                El histórico importado conserva análisis de Escaño Abierto. Los nuevos análisis usan
                Helmcode y guardan el modelo, la versión del prompt y el hash de entrada.
              </p>
            </Section>
            <Section title="Puedes reutilizarlos">
              <p>
                La API es pública, tiene filtros y permite descargar los conjuntos originales. El
                código del recolector se ha adaptado de Escaño Abierto, con licencia MIT y su
                atribución.
              </p>
              <div className="cg-tabs">
                <Link className="boton" href="/api/congreso">
                  Consultar la API
                </Link>
                <Link className="boton-claro" href="/api/congreso/descarga">
                  Descargar el histórico
                </Link>
                <Source url="https://github.com/jorgegarcelan/escano-abierto">
                  Código de origen
                </Source>
              </div>
            </Section>
          </>
        )}
      </>
    );
  } else {
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
                <article className="cg-card" key={pleno.fecha}>
                  <h3>{date(pleno.fecha)}</h3>
                  <ul>
                    {pleno.puntos.map((p, i) => (
                      <li key={i}>{p.titulo}</li>
                    ))}
                  </ul>
                </article>
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
    <main id="main" tabIndex={-1}>
      {section === '' && (
        <section className="cg-hero">
          <span className="t-etiqueta">Un proyecto de Reforma Digital</span>
          <h1>Lo que pasa en el Congreso, contado para cualquiera.</h1>
          <p>
            Cada pleno resumido, cada votación con el voto de cada diputado y cada ley, desde que
            entra hasta que se publica. Con datos oficiales, en lenguaje claro y con código abierto.
          </p>
          <a className="boton-claro" href="#lo-ultimo">
            Lo último del Congreso ↓
          </a>
        </section>
      )}
      <div className="cg-body">
        {['', 'dias', 'votaciones', 'diputado', 'grupos', 'oradores'].includes(section) && (
          <form
            className="cg-period"
            action={`${congressBase}/${section}${detail ? `/${detail}` : ''}`}
          >
            <label htmlFor="congress-period">Periodo</label>
            <select id="congress-period" className="campo" name="periodo" defaultValue={periodo}>
              <option value="reciente">Últimos tres meses</option>
              <option value="todo">Toda la legislatura</option>
              {index.meses
                .slice()
                .reverse()
                .map((m) => (
                  <option key={m.mes}>{m.mes}</option>
                ))}
            </select>
            <button className="boton-claro" type="submit">
              Aplicar
            </button>
          </form>
        )}
        {content}
        <p className="cg-provenance">
          Snapshot generado el {date(index.meta.generado)}. Los distintos conjuntos pueden tener
          fechas de actualización diferentes. <Link href={href('metodo')}>Método y fuentes</Link>.
        </p>
      </div>
    </main>
  );
}
