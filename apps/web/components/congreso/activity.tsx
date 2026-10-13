import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@reforma-digital/design/ui/table';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@reforma-digital/design/ui/collapsible';
import { Card } from '@reforma-digital/design/ui/card';

import { Icon } from '../brand/icon';
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
    <div
      className={
        'cg-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-5 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_560px)]:[grid-template-columns:1fr]'
      }
    >
      {interventions.map((iv, i) => (
        <Card
          key={`${iv.s}-${i}`}
          render={
            <article
              className={
                'cg-card [overflow-wrap:anywhere] [&_h2]:[font-size:28px] [&_h3]:text-lg [&_h3]:[line-height:1.3] [&_h3]:[margin:12px_0] [&_p]:[color:var(--text-secondary)] [&_p]:[margin:12px_0] [&_.cg-stats]:gap-5 [&_.cg-stats_dd]:[font-size:28px] [&_.cg-stats_dt]:[max-width:14ch]'
              }
            />
          }
        >
          <span
            className={
              't-etiqueta [font-family:var(--font-brand-mono)] text-xs font-medium [line-height:1.3] [letter-spacing:0.08em] uppercase'
            }
          >
            {iv.g} · {iv.tono}
          </span>
          <h3>{iv.orador}</h3>
          <p className={'cg-muted [color:var(--muted-foreground)] text-sm'}>{iv.item}</p>
          <AI>
            <p>{iv.frase || iv.resumen || 'El resumen está en la ficha de la sesión.'}</p>
          </AI>
          {iv.cita && <blockquote>«{iv.cita}»</blockquote>}
          {iv.ia && (
            <Collapsible>
              <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-3 text-left">
                <span>{'Cómo se generó'}</span>
                <span aria-hidden="true" className="flex shrink-0 group-data-open:rotate-180">
                  {<Icon name="abajo" size={16} />}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p>
                  Modelo: {iv.ia.model}. Prompt: {iv.ia.prompt}.{' '}
                  {iv.ia.provider === 'cache-importada'
                    ? 'Análisis conservado del histórico de Escaño Abierto.'
                    : 'Generado en Reforma Digital con Helmcode.'}
                </p>
              </CollapsibleContent>
            </Collapsible>
          )}
          <Link href={href(`sesion/${iv.s.toLowerCase()}`)}>Ver la sesión</Link>
        </Card>
      ))}
    </div>
  ) : (
    <Empty>No hay intervenciones analizadas en este periodo.</Empty>
  );
}
function Laws({ laws, legislature }: { laws: Law[]; legislature: string }) {
  return laws.length ? (
    <div
      className={
        'cg-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-5 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_560px)]:[grid-template-columns:1fr]'
      }
    >
      {laws.map((law) => (
        <Card
          key={law.exp}
          render={
            <article
              className={
                'cg-card [overflow-wrap:anywhere] [&_h2]:[font-size:28px] [&_h3]:text-lg [&_h3]:[line-height:1.3] [&_h3]:[margin:12px_0] [&_p]:[color:var(--text-secondary)] [&_p]:[margin:12px_0] [&_.cg-stats]:gap-5 [&_.cg-stats_dd]:[font-size:28px] [&_.cg-stats_dt]:[max-width:14ch]'
              }
            />
          }
        >
          <span
            className={
              't-etiqueta [font-family:var(--font-brand-mono)] text-xs font-medium [line-height:1.3] [letter-spacing:0.08em] uppercase'
            }
          >
            {law.tipo} · {law.estado}
          </span>
          <h3>
            <Link href={href(`iniciativa/${law.exp.replace('/', '-')}`)}>{law.titulo}</Link>
          </h3>
          <p>{law.situacion}</p>
          <Source url={congressUrl(law.exp, legislature)}>Expediente {law.exp}</Source>
        </Card>
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
        <div
          className={
            'cg-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-5 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_560px)]:[grid-template-columns:1fr]'
          }
        >
          {questions.map(({ content: question }) => (
            <Card
              key={question.exp}
              render={
                <article
                  className={
                    'cg-card [overflow-wrap:anywhere] [&_h2]:[font-size:28px] [&_h3]:text-lg [&_h3]:[line-height:1.3] [&_h3]:[margin:12px_0] [&_p]:[color:var(--text-secondary)] [&_p]:[margin:12px_0] [&_.cg-stats]:gap-5 [&_.cg-stats_dd]:[font-size:28px] [&_.cg-stats_dt]:[max-width:14ch]'
                  }
                />
              }
            >
              <span
                className={
                  't-etiqueta [font-family:var(--font-brand-mono)] text-xs font-medium [line-height:1.3] [letter-spacing:0.08em] uppercase'
                }
              >
                {question.estado} · {date(question.presentada)}
              </span>
              <h3>{question.titulo}</h3>
              <p>{question.autores.map(([name]) => name).join(', ')}</p>
              <Source url={congressUrl(question.exp, index.meta.legislatura)}>
                Expediente {question.exp}
              </Source>
            </Card>
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
            <ol
              className={
                'cg-timeline list-none p-0 [&_li]:[padding:0_0_24px_24px] [&_li]:[border-left:2px_solid_var(--border)] [&_h3]:[margin:8px_0] [&_h3]:text-lg'
              }
            >
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
          <div
            className={
              'cg-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-5 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_560px)]:[grid-template-columns:1fr]'
            }
          >
            {data.aprobadas.map((law, i) => (
              <Card
                key={`${law.pdf}-${i}`}
                render={
                  <article
                    className={
                      'cg-card [overflow-wrap:anywhere] [&_h2]:[font-size:28px] [&_h3]:text-lg [&_h3]:[line-height:1.3] [&_h3]:[margin:12px_0] [&_p]:[color:var(--text-secondary)] [&_p]:[margin:12px_0] [&_.cg-stats]:gap-5 [&_.cg-stats_dd]:[font-size:28px] [&_.cg-stats_dt]:[max-width:14ch]'
                    }
                  />
                }
              >
                <h3>{law.titulo}</h3>
                <p>{date(law.fecha)}</p>
                <Source url={law.pdf}>Publicación oficial</Source>
              </Card>
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
          <div
            className={
              'cg-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-5 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_560px)]:[grid-template-columns:1fr]'
            }
          >
            {Object.entries(topics).map(([id, topic]) => (
              <Card
                key={id}
                render={
                  <Link
                    href={href(`tema/${id}`)}
                    className={
                      'cg-card [overflow-wrap:anywhere] [&_h2]:[font-size:28px] [&_h3]:text-lg [&_h3]:[line-height:1.3] [&_h3]:[margin:12px_0] [&_p]:[color:var(--text-secondary)] [&_p]:[margin:12px_0] [&_.cg-stats]:gap-5 [&_.cg-stats_dd]:[font-size:28px] [&_.cg-stats_dt]:[max-width:14ch]'
                    }
                  />
                }
              >
                <h2>{topic.nombre}</h2>
                <p>
                  {number(topic.votos.length)} votaciones · {topic.leyes.length} iniciativas ·{' '}
                  {number(topic.preguntas)} preguntas
                </p>
              </Card>
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
          <div
            className={
              'cg-table overflow-x-auto [&_table]:[border-collapse:collapse] [&_table]:w-full [&_table]:text-left [&_th]:p-3 [&_th]:[border-bottom:1px_solid_var(--border)] [&_th]:[vertical-align:top] [&_td]:p-3 [&_td]:[border-bottom:1px_solid_var(--border)] [&_td]:[vertical-align:top] [&_th]:text-sm'
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Diputado</TableHead>
                  <TableHead>Grupo en la votación</TableHead>
                  <TableHead>Voto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {index.diputados.map(
                  (d, i) =>
                    vote.v.charAt(i) &&
                    vote.v.charAt(i) !== '-' && (
                      <TableRow key={d.nombre}>
                        <TableCell>
                          <Link href={href(`diputado/${slug(d.nombre)}`)}>{d.nombre}</Link>
                        </TableCell>
                        <TableCell>{vote.cg?.[String(i)] || d.grupo}</TableCell>
                        <TableCell>{names[vote.v.charAt(i)]}</TableCell>
                      </TableRow>
                    ),
                )}
              </TableBody>
            </Table>
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
          <ol
            className={
              'cg-timeline list-none p-0 [&_li]:[padding:0_0_24px_24px] [&_li]:[border-left:2px_solid_var(--border)] [&_h3]:[margin:8px_0] [&_h3]:text-lg'
            }
          >
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
              <Collapsible
                className={
                  'cg-transcript [padding:16px_0] [border-bottom:1px_solid_var(--border)] [&_summary]:cursor-pointer [&_summary]:font-medium [&_p]:[max-width:80ch] [&_p]:[white-space:pre-line]'
                }
                key={i}
              >
                <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-3 text-left">
                  <span>
                    {
                      <>
                        {iv.orador} · {iv.grupo} · {iv.item || 'Turno de palabra'}
                      </>
                    }
                  </span>
                  <span aria-hidden="true" className="flex shrink-0 group-data-open:rotate-180">
                    {<Icon name="abajo" size={16} />}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p>{iv.texto}</p>
                </CollapsibleContent>
              </Collapsible>
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
