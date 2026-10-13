import { cn } from '@reforma-digital/design/lib/utils';
import { Card, CardContent } from '@reforma-digital/design/ui/card';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@reforma-digital/design/ui/collapsible';
import { buttonVariants, Button } from '@reforma-digital/design/ui/button';
import { Input } from '@reforma-digital/design/ui/input';

import { Icon } from '../brand/icon';
import {
  quotesSchema,
  proposalsSchema,
  responsesSchema,
  radarSchema,
} from '../../lib/congreso/schema';
import Link from 'next/link';
import { read, getWeeks, getPeriod } from '../../lib/congreso/data';
import { notFound } from 'next/navigation';
import {
  Intro,
  Section,
  Stats,
  AI,
  Sessions,
  Votes,
  Pagination,
  Empty,
  date,
  href,
} from './common';

export async function Explore({
  section,
  detail,
  query,
  page,
  tab,
}: {
  section: string;
  detail?: string;
  query: string;
  page: number;
  tab: string;
}) {
  if (section === 'semana') {
    const weeks = await getWeeks();
    const week = detail ? weeks.find((w) => w.id === detail) : weeks[weeks.length - 1];
    if (detail && !week) notFound();
    if (!week) return <Empty>No hay semanas disponibles.</Empty>;
    const data = await getPeriod('todo');
    return (
      <>
        <Intro label={`${date(week.desde)} → ${date(week.hasta)}`} title={week.titular} />
        <Stats
          items={[
            [week.votaciones.length, 'Votaciones'],
            [week.sesiones.length, 'Sesiones'],
            [week.intervenciones, 'Intervenciones analizadas'],
          ]}
        />
        <AI>
          <div
            className={
              'cg-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-5 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_560px)]:[grid-template-columns:1fr]'
            }
          >
            {week.citas.map((c, i) => (
              <blockquote key={i}>
                «{c.cita}»
                <footer>
                  {c.orador} · {c.g}
                </footer>
              </blockquote>
            ))}
          </div>
        </AI>
        <Section title="Sesiones">
          <Sessions sessions={data.sesiones.filter((s) => week.sesiones.includes(s.id))} />
        </Section>
        <Section title="Votaciones">
          <Votes votes={data.votaciones.filter((v) => week.votaciones.includes(v.id))} />
        </Section>
        <Section title="Otras semanas">
          <div
            className={
              'cg-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-5 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_560px)]:[grid-template-columns:1fr]'
            }
          >
            {weeks
              .slice()
              .reverse()
              .map((w) => (
                <Card
                  key={w.id}
                  render={
                    <Link
                      className={
                        'cg-card [overflow-wrap:anywhere] [&_h2]:[font-size:28px] [&_h3]:text-lg [&_h3]:[line-height:1.3] [&_h3]:[margin:12px_0] [&_p]:[color:var(--text-secondary)] [&_p]:[margin:12px_0] [&_.cg-stats]:gap-5 [&_.cg-stats_dd]:[font-size:28px] [&_.cg-stats_dt]:[max-width:14ch]'
                      }
                      href={href(`semana/${w.id}`)}
                    />
                  }
                >
                  <CardContent>
                    <time dateTime={w.desde}>{date(w.desde)}</time>
                    <h3>{w.titular}</h3>
                  </CardContent>
                </Card>
              ))}
          </div>
        </Section>
      </>
    );
  }
  const tabs = [
    ['citas', 'Citas'],
    ['propuestas', 'Propuestas'],
    ['contesta', 'Respuestas del Gobierno'],
    ['radar', 'Temas en el tiempo'],
  ];
  const selected = tabs.some(([id]) => id === tab) ? tab : 'citas';
  let content;
  if (selected === 'propuestas') {
    const proposals = await read('explora-propuestas.json', proposalsSchema);
    const lines = Object.entries(proposals).flatMap(([topic, groups]) =>
      Object.entries(groups).flatMap(([group, data]) =>
        data.lineas
          .filter((line) =>
            `${line.titulo} ${topic} ${group}`.toLowerCase().includes(query.toLowerCase()),
          )
          .map((line) => ({ topic, group, ...line })),
      ),
    );
    content = (
      <>
        <div
          className={
            'cg-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-5 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_560px)]:[grid-template-columns:1fr]'
          }
        >
          {lines.slice((page - 1) * 24, page * 24).map((line, i) => (
            <Card
              key={i}
              render={
                <article
                  className={
                    'cg-card [overflow-wrap:anywhere] [&_h2]:[font-size:28px] [&_h3]:text-lg [&_h3]:[line-height:1.3] [&_h3]:[margin:12px_0] [&_p]:[color:var(--text-secondary)] [&_p]:[margin:12px_0] [&_.cg-stats]:gap-5 [&_.cg-stats_dd]:[font-size:28px] [&_.cg-stats_dt]:[max-width:14ch]'
                  }
                />
              }
            >
              <CardContent>
                <span
                  className={
                    't-etiqueta [font-family:var(--font-brand-mono)] text-xs font-medium [line-height:1.3] [letter-spacing:0.08em] uppercase'
                  }
                >
                  {line.topic} · {line.group}
                </span>
                <h3>{line.titulo}</h3>
                <p>{line.n} menciones</p>
                <Collapsible>
                  <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-3 text-left">
                    <span>{'Ejemplos en los Diarios'}</span>
                    <span aria-hidden="true" className="flex shrink-0 group-data-open:rotate-180">
                      {<Icon name="abajo" size={16} />}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {line.ejemplos.map(([text, speaker, session, day], j) => (
                      <blockquote key={j}>
                        {text}
                        <footer>
                          {speaker} ·{' '}
                          <Link href={href(`sesion/${session.toLowerCase()}`, day.slice(0, 7))}>
                            {date(day)}
                          </Link>
                        </footer>
                      </blockquote>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          ))}
        </div>
        <Pagination page={page} total={lines.length} params={{ q: query, vista: selected }} />
      </>
    );
  } else if (selected === 'contesta') {
    const data = await read('explora-contesta.json', responsesSchema);
    content = (
      <div
        className={
          'cg-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-5 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_560px)]:[grid-template-columns:1fr]'
        }
      >
        {data.ministros
          .filter((m) => `${m.orador} ${m.rol}`.toLowerCase().includes(query.toLowerCase()))
          .map((m) => (
            <Card
              key={m.orador}
              render={
                <article
                  className={
                    'cg-card [overflow-wrap:anywhere] [&_h2]:[font-size:28px] [&_h3]:text-lg [&_h3]:[line-height:1.3] [&_h3]:[margin:12px_0] [&_p]:[color:var(--text-secondary)] [&_p]:[margin:12px_0] [&_.cg-stats]:gap-5 [&_.cg-stats_dd]:[font-size:28px] [&_.cg-stats_dt]:[max-width:14ch]'
                  }
                />
              }
            >
              <CardContent>
                <span
                  className={
                    't-etiqueta [font-family:var(--font-brand-mono)] text-xs font-medium [line-height:1.3] [letter-spacing:0.08em] uppercase'
                  }
                >
                  {m.rol}
                </span>
                <h3>{m.orador}</h3>
                <Stats
                  items={[
                    [m.si, 'Contesta'],
                    [m.parcial, 'Parcialmente'],
                    [m.no, 'No contesta'],
                  ]}
                />
                <Collapsible>
                  <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-3 text-left">
                    <span>{'Consultar los casos'}</span>
                    <span aria-hidden="true" className="flex shrink-0 group-data-open:rotate-180">
                      {<Icon name="abajo" size={16} />}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {m.casos.map(([day, session, response, reason], i) => (
                      <p key={i}>
                        <b>{response}</b> · {reason}{' '}
                        <Link href={href(`sesion/${session.toLowerCase()}`, day.slice(0, 7))}>
                          {date(day)}
                        </Link>
                      </p>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          ))}
      </div>
    );
  } else if (selected === 'radar') {
    const data = await read('explora-radar.json', radarSchema);
    const topics = Object.entries(data.temas)
      .filter(([, t]) => t.tema.toLowerCase().includes(query.toLowerCase()))
      .sort(([, a], [, b]) => b.n - a.n);
    content = (
      <>
        <div
          className={
            'cg-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-5 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_560px)]:[grid-template-columns:1fr]'
          }
        >
          {topics.slice((page - 1) * 24, page * 24).map(([id, t]) => (
            <Card
              key={id}
              render={
                <article
                  className={
                    'cg-card [overflow-wrap:anywhere] [&_h2]:[font-size:28px] [&_h3]:text-lg [&_h3]:[line-height:1.3] [&_h3]:[margin:12px_0] [&_p]:[color:var(--text-secondary)] [&_p]:[margin:12px_0] [&_.cg-stats]:gap-5 [&_.cg-stats_dd]:[font-size:28px] [&_.cg-stats_dt]:[max-width:14ch]'
                  }
                />
              }
            >
              <CardContent>
                <h3>{t.tema}</h3>
                <p>
                  {t.n} menciones · desde {date(t.primera)}
                </p>
                <div
                  className={
                    'cg-spark h-16 flex items-end [gap:1px] [&_>_span]:[flex:1] [&_>_span]:[background:var(--brand)]'
                  }
                  role="img"
                  aria-label={`${t.n} menciones, por semanas`}
                >
                  {t.serie.map((n, i) => (
                    <span
                      key={i}
                      style={{ height: `${Math.max(2, (n / Math.max(1, ...t.serie)) * 100)}%` }}
                    >
                      <span
                        className={
                          'sr-only absolute [width:1px] [height:1px] p-0 [margin:-1px] overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap border-0'
                        }
                      >
                        Semana {i + 1}: {n}
                      </span>
                    </span>
                  ))}
                </div>
                <Collapsible>
                  <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-3 text-left">
                    <span>{'Recuentos por semana'}</span>
                    <span aria-hidden="true" className="flex shrink-0 group-data-open:rotate-180">
                      {<Icon name="abajo" size={16} />}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ol>
                      {t.serie.map((n, i) => (
                        <li key={i}>
                          Semana {i + 1}: {n}
                        </li>
                      ))}
                    </ol>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          ))}
        </div>
        <Pagination page={page} total={topics.length} params={{ q: query, vista: selected }} />
      </>
    );
  } else {
    const quotes = (await read('explora-citas.json', quotesSchema)).filter((c) =>
      `${c[0]} ${c[1]} ${c[2]}`.toLowerCase().includes(query.toLowerCase()),
    );
    content = (
      <>
        <div
          className={
            'cg-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-5 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_560px)]:[grid-template-columns:1fr]'
          }
        >
          {quotes
            .slice((page - 1) * 24, page * 24)
            .map(([text, speaker, group, session, day], i) => (
              <Card
                key={i}
                render={
                  <blockquote
                    className={
                      'cg-card [overflow-wrap:anywhere] [&_h2]:[font-size:28px] [&_h3]:text-lg [&_h3]:[line-height:1.3] [&_h3]:[margin:12px_0] [&_p]:[color:var(--text-secondary)] [&_p]:[margin:12px_0] [&_.cg-stats]:gap-5 [&_.cg-stats_dd]:[font-size:28px] [&_.cg-stats_dt]:[max-width:14ch]'
                    }
                  />
                }
              >
                <CardContent>
                  «{text}»
                  <footer>
                    {speaker} · {group} ·{' '}
                    <Link href={href(`sesion/${session.toLowerCase()}`, day.slice(0, 7))}>
                      {date(day)}
                    </Link>
                  </footer>
                </CardContent>
              </Card>
            ))}
        </div>
        <Pagination page={page} total={quotes.length} params={{ q: query, vista: selected }} />
      </>
    );
  }
  return (
    <>
      <nav
        aria-label={'Explorar'}
        className="flex flex-wrap items-center gap-3 mb-6 [&_[aria-current=page]]:bg-primary [&_[aria-current=page]]:text-primary-foreground"
      >
        {tabs.map(([id, name]) => (
          <Link
            key={id}
            href={`?vista=${id}`}
            aria-current={selected === id ? 'page' : undefined}
            data-slot="button"
            data-variant="ghost"
            className={cn(buttonVariants({ variant: 'ghost' }))}
          >
            {name}
          </Link>
        ))}
      </nav>
      <form
        className={
          'cg-filters flex items-end flex-wrap gap-4 [margin:24px_0] [&_label]:[flex:1] [&_label]:[min-width:180px] [&_label]:[max-width:400px] [&_label]:grid [&_label]:gap-2 [&_label]:text-sm'
        }
        action={href('explora')}
      >
        <input type="hidden" name="vista" value={selected} />
        <label>
          Buscar
          <Input type="search" name="q" defaultValue={query} maxLength={200} />
        </label>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>
      <AI>{content}</AI>
    </>
  );
}
