import { Disclosure, Surface } from '@reforma-digital/design/sol';
import { Icon } from '../sol/icon';
import { topicSchema, rawQuestionSchema, rawSessionSchema } from '../../lib/congreso/schema';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from '@reforma-digital/db';
import { z } from 'zod';
import { getPeriod, getLaws, getQuestions, read, congressUrl, slug } from '../../lib/congreso/data';
import type { CongressIndex, Intervention, Law } from '../../lib/congreso/schema';
import {
  Intro,
  Section,
  Stats,
  Empty,
  Source,
  AI,
  Votes,
  VoteCount,
  Sessions,
  Filters,
  Pagination,
  Hemicycle,
  date,
  href,
  number,
} from './common';

export function Interventions({
  interventions,
}: {
  interventions: (Intervention & { item: string })[];
}) {
  return interventions.length ? (
    <div className="cg-grid">
      {interventions.map((iv, i) => (
        <Surface asChild key={`${iv.s}-${i}`}>
          <article className="cg-card">
            <span className="t-etiqueta">
              {iv.g} · {iv.tono}
            </span>
            <h3>{iv.orador}</h3>
            <p className="cg-muted">{iv.item}</p>
            <AI>
              <p>{iv.frase || iv.resumen || 'El resumen está en la ficha de la sesión.'}</p>
            </AI>
            {iv.cita && <blockquote>«{iv.cita}»</blockquote>}
            {iv.ia && (
              <Disclosure title="Cómo se generó" icon={<Icon name="abajo" size={16} />}>
                <p>
                  Modelo: {iv.ia.model}. Prompt: {iv.ia.prompt}.{' '}
                  {iv.ia.provider === 'cache-importada'
                    ? 'Análisis conservado del histórico de Escaño Abierto.'
                    : 'Generado en Reforma Digital con Helmcode.'}
                </p>
              </Disclosure>
            )}
            <Link href={href(`sesion/${iv.s.toLowerCase()}`)}>Ver la sesión</Link>
          </article>
        </Surface>
      ))}
    </div>
  ) : (
    <Empty>No hay intervenciones analizadas en este periodo.</Empty>
  );
}
function Laws({ laws, legislature }: { laws: Law[]; legislature: string }) {
  return laws.length ? (
    <div className="cg-grid">
      {laws.map((law) => (
        <Surface asChild key={law.exp}>
          <article className="cg-card">
            <span className="t-etiqueta">
              {law.tipo} · {law.estado}
            </span>
            <h3>
              <Link href={href(`iniciativa/${law.exp.replace('/', '-')}`)}>{law.titulo}</Link>
            </h3>
            <p>{law.situacion}</p>
            <Source url={congressUrl(law.exp, legislature)}>Expediente {law.exp}</Source>
          </article>
        </Surface>
      ))}
    </div>
  ) : (
    <Empty />
  );
}

export async function Activity({
  section,
  detail,
  index,
  period,
  query,
  page,
}: {
  section: string;
  detail?: string;
  index: CongressIndex;
  period: string;
  query: string;
  page: number;
}) {
  if (section === 'preguntas') {
    const summary = await getQuestions();
    const sql = connection();
    const pattern = `%${query}%`;
    const [count, rows] = await Promise.all([
      sql`SELECT count(*)::int AS total FROM congreso_questions WHERE legislature=${index.meta.legislatura} AND title ILIKE ${pattern}`,
      sql`SELECT content FROM congreso_questions WHERE legislature=${index.meta.legislatura} AND title ILIKE ${pattern} ORDER BY date DESC,id LIMIT 24 OFFSET ${(page - 1) * 24}`,
    ]);
    const questions = z.array(z.object({ content: rawQuestionSchema })).parse(rows);
    return (
      <>
        <Stats
          items={[
            [summary.total, 'Preguntas registradas'],
            [summary.estados.pendiente ?? 0, 'Pendientes'],
            [summary.demora.mediana ?? '—', 'Mediana de días hasta contestar'],
          ]}
        />
        <Filters action={href('preguntas')} query={query} />
        <div className="cg-grid">
          {questions.map(({ content: question }) => (
            <Surface asChild key={question.exp}>
              <article className="cg-card">
                <span className="t-etiqueta">
                  {question.estado} · {date(question.presentada)}
                </span>
                <h3>{question.titulo}</h3>
                <p>{question.autores.map(([name]) => name).join(', ')}</p>
                <Source url={congressUrl(question.exp, index.meta.legislatura)}>
                  Expediente {question.exp}
                </Source>
              </article>
            </Surface>
          ))}
        </div>
        {!questions.length && <Empty />}
        <Pagination page={page} total={z.number().parse(count[0]?.total)} params={{ q: query }} />
      </>
    );
  }
  if (section === 'leyes' || section === 'iniciativa') {
    const data = await getLaws();
    if (section === 'iniciativa') {
      const law = data.iniciativas.find((law) => law.exp.replace('/', '-') === detail);
      if (!law) notFound();
      return (
        <>
          <Intro label={law.tipo} title={law.titulo}>
            <p>{law.situacion}</p>
          </Intro>
          <Stats
            items={[
              [law.estado, 'Estado'],
              [date(law.presentada), 'Presentada'],
              [law.etapa, 'Etapa'],
            ]}
          />
          <Source url={congressUrl(law.exp, index.meta.legislatura)}>Expediente completo</Source>
          <Section title="Tramitación">
            <ol className="cg-timeline">
              {law.fases.map(([organ, phase, from, to], i) => (
                <li key={i}>
                  <h3>{phase}</h3>
                  <p>
                    {organ} · {from}
                    {to ? ` → ${to}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </Section>
          <Section title="Votaciones relacionadas">
            <Votes votes={(await getPeriod('todo')).votaciones.filter((v) => v.exp === law.exp)} />
          </Section>
        </>
      );
    }
    const laws = data.iniciativas.filter((law) =>
      `${law.titulo} ${law.estado}`.toLowerCase().includes(query.toLowerCase()),
    );
    return (
      <>
        <Filters action={href('leyes')} query={query} />
        <Laws laws={laws.slice((page - 1) * 24, page * 24)} legislature={index.meta.legislatura} />
        <Pagination page={page} total={laws.length} params={{ q: query }} />
        <Section title="Leyes publicadas">
          <div className="cg-grid">
            {data.aprobadas.map((law, i) => (
              <Surface asChild key={`${law.pdf}-${i}`}>
                <article className="cg-card">
                  <h3>{law.titulo}</h3>
                  <p>{date(law.fecha)}</p>
                  <Source url={law.pdf}>Publicación oficial</Source>
                </article>
              </Surface>
            ))}
          </div>
        </Section>
      </>
    );
  }
  if (section === 'temas' || section === 'tema') {
    const topics = await read('temas.json', topicSchema);
    if (section === 'temas')
      return (
        <>
          <div className="cg-grid">
            {Object.entries(topics).map(([id, topic]) => (
              <Surface asChild key={id}>
                <Link href={href(`tema/${id}`)} className="cg-card">
                  <h2>{topic.nombre}</h2>
                  <p>
                    {number(topic.votos.length)} votaciones · {topic.leyes.length} iniciativas ·{' '}
                    {number(topic.preguntas)} preguntas
                  </p>
                </Link>
              </Surface>
            ))}
          </div>
        </>
      );
    const topic = detail && topics[detail];
    if (!topic) notFound();
    const data = await getPeriod('todo');
    return (
      <>
        <Intro title={topic.nombre} />
        <Stats
          items={[
            [topic.votos.length, 'Votaciones'],
            [topic.leyes.length, 'Iniciativas'],
            [topic.preguntas, 'Preguntas'],
          ]}
        />
        <Votes
          votes={data.votaciones
            .filter((v) => v.tm?.includes(detail ?? ''))
            .slice((page - 1) * 24, page * 24)}
        />
        <Pagination page={page} total={topic.votos.length} params={{}} />
        <Section title="Leyes relacionadas">
          <Laws
            laws={(await getLaws()).iniciativas.filter((l) => topic.leyes.includes(l.exp))}
            legislature={index.meta.legislatura}
          />
        </Section>
      </>
    );
  }
  let selectedPeriod = period;
  if (detail && ['sesion', 'votacion'].includes(section)) {
    const sql = connection();
    const rows =
      section === 'sesion'
        ? await sql`SELECT date::text FROM congreso_sessions WHERE legislature=${index.meta.legislatura} AND lower(id)=${detail}`
        : await sql`SELECT date::text FROM congreso_votes WHERE legislature=${index.meta.legislatura} AND id=${detail}`;
    selectedPeriod = rows[0]?.date ? z.string().parse(rows[0].date).slice(0, 7) : 'todo';
  }
  const data = await getPeriod(selectedPeriod);
  if (section === 'votacion') {
    const vote = data.votaciones.find((vote) => vote.id === detail);
    if (!vote) notFound();
    const names: Record<string, string> = { S: 'Sí', N: 'No', A: 'Abstención', X: 'No vota' };
    return (
      <>
        <Intro label={`${date(vote.fecha)} · ${vote.tipo}`} title={vote.titulo}>
          <p>{vote.texto}</p>
        </Intro>
        <VoteCount vote={vote} />
        <p>
          Estos recuentos describen el voto. La aprobación depende del procedimiento y la mayoría
          exigida.
        </p>
        <Hemicycle index={index} vote={vote} />
        {vote.json && <Source url={vote.json}>Votación oficial</Source>}
        <Section title="El voto de cada diputado">
          <div className="cg-table">
            <table>
              <thead>
                <tr>
                  <th>Diputado</th>
                  <th>Grupo en la votación</th>
                  <th>Voto</th>
                </tr>
              </thead>
              <tbody>
                {index.diputados.map(
                  (d, i) =>
                    vote.v.charAt(i) &&
                    vote.v.charAt(i) !== '-' && (
                      <tr key={d.nombre}>
                        <td>
                          <Link href={href(`diputado/${slug(d.nombre)}`)}>{d.nombre}</Link>
                        </td>
                        <td>{vote.cg?.[String(i)] || d.grupo}</td>
                        <td>{names[vote.v.charAt(i)]}</td>
                      </tr>
                    ),
                )}
              </tbody>
            </table>
          </div>
        </Section>
      </>
    );
  }
  if (section === 'sesion') {
    const session = data.sesiones.find((session) => session.id.toLowerCase() === detail);
    if (!session) notFound();
    const rows =
      await connection()`SELECT content FROM congreso_sessions WHERE legislature=${index.meta.legislatura} AND id=${session.id}`;
    const raw = rows.length ? rawSessionSchema.parse(rows[0]?.content) : null;
    return (
      <>
        <Intro
          label={`${date(session.fecha)} · ${session.organo}`}
          title={session.titular || session.sesion}
        />
        {session.resumen && (
          <AI label={session.fuente === 'mvp' ? 'Resumen revisado del histórico' : undefined}>
            <p>{session.resumen}</p>
          </AI>
        )}
        {session.ds && <Source url={session.ds}>Diario de Sesiones</Source>}
        <Section title="Orden del día">
          <ol className="cg-timeline">
            {session.puntos.map((p, i) => (
              <li key={i}>
                <h3>{p.titulo}</h3>
                <p>{p.tipo}</p>
              </li>
            ))}
          </ol>
        </Section>
        <Section title="Votaciones">
          <Votes
            votes={data.votaciones.filter((v) =>
              session.puntos.some((p) => p.votos.includes(v.id)),
            )}
          />
        </Section>
        <Section title="Qué se dijo">
          <Interventions interventions={data.intervenciones.filter((i) => i.s === session.id)} />
        </Section>
        {raw && (
          <Section title="Intervenciones completas del Diario">
            <p>
              Texto extraído del PDF oficial; consulta el original para comprobar la transcripción.
            </p>
            {raw.intervenciones.map((iv, i) => (
              <Disclosure
                className="cg-transcript"
                key={i}
                title={
                  <>
                    {iv.orador} · {iv.grupo} · {iv.item || 'Turno de palabra'}
                  </>
                }
                icon={<Icon name="abajo" size={16} />}
              >
                <p>{iv.texto}</p>
              </Disclosure>
            ))}
          </Section>
        )}
      </>
    );
  }
  const votes = data.votaciones.filter((v) =>
    `${v.titulo} ${v.texto}`.toLowerCase().includes(query.toLowerCase()),
  );
  if (section === 'votaciones')
    return (
      <>
        <Filters action={href('votaciones')} query={query} period={period} />
        <Votes votes={votes.slice((page - 1) * 24, page * 24)} />
        <Pagination page={page} total={votes.length} params={{ q: query, periodo: period }} />
      </>
    );
  const sessions = data.sesiones.filter((s) =>
    `${s.organo} ${s.titular} ${s.resumen}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <Filters action={href('dias')} query={query} period={period} />
      <Sessions sessions={sessions.slice((page - 1) * 24, page * 24)} />
      <Pagination page={page} total={sessions.length} params={{ q: query, periodo: period }} />
    </>
  );
}
