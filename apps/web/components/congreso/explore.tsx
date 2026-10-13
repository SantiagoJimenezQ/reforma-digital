import { Surface, Disclosure, Button, Tabs, Field } from '@reforma-digital/design/sol';
import { Icon } from '../sol/icon';
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
          <div className="cg-grid">
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
          <div className="cg-grid">
            {weeks
              .slice()
              .reverse()
              .map((w) => (
                <Surface asChild key={w.id}>
                  <Link className="cg-card" href={href(`semana/${w.id}`)}>
                    <time dateTime={w.desde}>{date(w.desde)}</time>
                    <h3>{w.titular}</h3>
                  </Link>
                </Surface>
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
        <div className="cg-grid">
          {lines.slice((page - 1) * 24, page * 24).map((line, i) => (
            <Surface asChild key={i}>
              <article className="cg-card">
                <span className="t-etiqueta">
                  {line.topic} · {line.group}
                </span>
                <h3>{line.titulo}</h3>
                <p>{line.n} menciones</p>
                <Disclosure title="Ejemplos en los Diarios" icon={<Icon name="abajo" size={16} />}>
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
                </Disclosure>
              </article>
            </Surface>
          ))}
        </div>
        <Pagination page={page} total={lines.length} params={{ q: query, vista: selected }} />
      </>
    );
  } else if (selected === 'contesta') {
    const data = await read('explora-contesta.json', responsesSchema);
    content = (
      <div className="cg-grid">
        {data.ministros
          .filter((m) => `${m.orador} ${m.rol}`.toLowerCase().includes(query.toLowerCase()))
          .map((m) => (
            <Surface asChild key={m.orador}>
              <article className="cg-card">
                <span className="t-etiqueta">{m.rol}</span>
                <h3>{m.orador}</h3>
                <Stats
                  items={[
                    [m.si, 'Contesta'],
                    [m.parcial, 'Parcialmente'],
                    [m.no, 'No contesta'],
                  ]}
                />
                <Disclosure title="Consultar los casos" icon={<Icon name="abajo" size={16} />}>
                  {m.casos.map(([day, session, response, reason], i) => (
                    <p key={i}>
                      <b>{response}</b> · {reason}{' '}
                      <Link href={href(`sesion/${session.toLowerCase()}`, day.slice(0, 7))}>
                        {date(day)}
                      </Link>
                    </p>
                  ))}
                </Disclosure>
              </article>
            </Surface>
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
        <div className="cg-grid">
          {topics.slice((page - 1) * 24, page * 24).map(([id, t]) => (
            <Surface asChild key={id}>
              <article className="cg-card">
                <h3>{t.tema}</h3>
                <p>
                  {t.n} menciones · desde {date(t.primera)}
                </p>
                <div className="cg-spark" role="img" aria-label={`${t.n} menciones, por semanas`}>
                  {t.serie.map((n, i) => (
                    <span
                      key={i}
                      style={{ height: `${Math.max(2, (n / Math.max(1, ...t.serie)) * 100)}%` }}
                    >
                      <span className="sr-only">
                        Semana {i + 1}: {n}
                      </span>
                    </span>
                  ))}
                </div>
                <Disclosure title="Recuentos por semana" icon={<Icon name="abajo" size={16} />}>
                  <ol>
                    {t.serie.map((n, i) => (
                      <li key={i}>
                        Semana {i + 1}: {n}
                      </li>
                    ))}
                  </ol>
                </Disclosure>
              </article>
            </Surface>
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
        <div className="cg-grid">
          {quotes
            .slice((page - 1) * 24, page * 24)
            .map(([text, speaker, group, session, day], i) => (
              <Surface asChild key={i}>
                <blockquote className="cg-card">
                  «{text}»
                  <footer>
                    {speaker} · {group} ·{' '}
                    <Link href={href(`sesion/${session.toLowerCase()}`, day.slice(0, 7))}>
                      {date(day)}
                    </Link>
                  </footer>
                </blockquote>
              </Surface>
            ))}
        </div>
        <Pagination page={page} total={quotes.length} params={{ q: query, vista: selected }} />
      </>
    );
  }
  return (
    <>
      <Tabs label="Explorar">
        {tabs.map(([id, name]) => (
          <Button asChild variant="ghost" key={id}>
            <Link href={`?vista=${id}`} aria-current={selected === id ? 'page' : undefined}>
              {name}
            </Link>
          </Button>
        ))}
      </Tabs>
      <form className="cg-filters" action={href('explora')}>
        <input type="hidden" name="vista" value={selected} />
        <label>
          Buscar
          <Field type="search" name="q" defaultValue={query} maxLength={200} />
        </label>
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>
      <AI>{content}</AI>
    </>
  );
}
