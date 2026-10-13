import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@reforma-digital/design/sol';
import type { CongressIndex, Session, Vote } from '../../lib/congreso/schema';
import { congressBase } from '../../lib/congreso/routes';
import { deputyName, slug } from '../../lib/congreso/data';
import { Icon } from '../sol/icon';

export const number = (value: number) => value.toLocaleString('es-ES');
export const date = (value: string) =>
  new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));
export const href = (path: string, month?: string) =>
  `${congressBase}/${path}${month ? `?periodo=${month}` : ''}`;

export function Intro({
  label = 'El Congreso',
  title,
  children,
  heading = 'h1',
}: {
  heading?: 'h1' | 'h2';
  label?: string;
  title: string;
  children?: ReactNode;
}) {
  const Heading = heading;
  return (
    <div className="cg-intro">
      <span className="t-etiqueta">{label}</span>
      <Heading>{title}</Heading>
      {children && <div className="cg-lead">{children}</div>}
    </div>
  );
}
export function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="cg-section">
      <div className="cg-section-title">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Stats({ items }: { items: [number | string, string][] }) {
  return (
    <dl className="cg-stats">
      {items.map(([value, label]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{typeof value === 'number' ? number(value) : value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function Empty({
  children = 'No hay resultados para estos filtros.',
}: {
  children?: ReactNode;
}) {
  return (
    <p className="cg-empty" role="status">
      {children}
    </p>
  );
}
export function Source({
  url,
  children = 'Fuente oficial',
}: {
  url: string;
  children?: ReactNode;
}) {
  return (
    <a className="cg-source" href={url} target="_blank" rel="noopener noreferrer">
      {children}
      <Icon name="externo" size={16} />
      <span className="sr-only"> (se abre en otra pestaña)</span>
    </a>
  );
}
export function AI({
  children,
  label = 'Análisis generado con IA · elaboración propia',
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div className="cg-analysis">
      <span className="t-etiqueta">{label}</span>
      {children}
    </div>
  );
}
export function Votes({ votes }: { votes: Vote[] }) {
  if (!votes.length) return <Empty />;
  return (
    <div className="cg-votes">
      {votes.map((vote) => (
        <article className="cg-vote" key={vote.id}>
          <div className="cg-vote-meta">
            <time dateTime={vote.fecha}>{date(vote.fecha)}</time>
            <span>{vote.tipo}</span>
          </div>
          <h3>
            <Link href={href(`votacion/${vote.id}`, vote.fecha.slice(0, 7))}>{vote.titulo}</Link>
          </h3>
          <VoteCount vote={vote} />
        </article>
      ))}
    </div>
  );
}
export function VoteCount({ vote }: { vote: Vote }) {
  const total = vote.si + vote.no + vote.abst + vote.novota;
  const values = [
    [vote.si, 'Sí', 'si'],
    [vote.no, 'No', 'no'],
    [vote.abst, 'Abstención', 'abst'],
    [vote.novota, 'No vota', 'ausente'],
  ] as const;
  return (
    <div className="cg-vote-count">
      <div className="cg-vote-bar" aria-hidden="true">
        {values.map(([value, label, kind]) => (
          <span key={label} className={`cg-voto-${kind}`} style={{ flex: value }} />
        ))}
      </div>
      <dl>
        {values.map(([value, label, kind]) => (
          <div key={label}>
            <dt>
              <i className={`cg-voto-${kind}`} aria-hidden="true" />
              {label}
            </dt>
            <dd>{number(value)}</dd>
          </div>
        ))}
      </dl>
      <span className="sr-only">Total: {total}</span>
    </div>
  );
}
export function Sessions({ sessions }: { sessions: Session[] }) {
  if (!sessions.length) return <Empty />;
  return (
    <div className="cg-session-list">
      {sessions.map((session) => (
        <article key={session.id}>
          <time dateTime={session.fecha}>{date(session.fecha)}</time>
          <div>
            <span className="t-etiqueta">{session.organo}</span>
            <h3>
              <Link href={href(`sesion/${session.id.toLowerCase()}`, session.fecha.slice(0, 7))}>
                {session.titular || session.sesion}
              </Link>
            </h3>
            {session.resumen && (
              <AI>
                <p>{session.resumen}</p>
              </AI>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
export function Hemicycle({
  index,
  vote,
  province,
}: {
  index: CongressIndex;
  vote?: Vote;
  province?: string;
}) {
  const voteNames: Record<string, string> = { S: 'Sí', N: 'No', A: 'Abstención', X: 'No vota' };
  if (vote) {
    const ballots = index.diputados.flatMap((deputy, i) => {
      const ballot = vote.v.charAt(i);
      return ballot && ballot !== '-' ? [{ deputy, ballot }] : [];
    });
    return ballots.length ? (
      <div className="cg-hemicycle">
        <p>
          El voto de cada diputado. La posición de los puntos no representa su asiento histórico.
        </p>
        <svg
          viewBox="0 0 300 180"
          role="img"
          aria-label="Votos individuales; detalle accesible en la tabla de diputados"
        >
          {ballots.map(({ deputy, ballot }, i) => (
            <circle
              key={deputy.nombre}
              cx={6 + (i % 25) * 12}
              cy={6 + Math.floor(i / 25) * 12}
              r={4}
              className={`cg-voto-${{ S: 'si', N: 'no', A: 'abst', X: 'ausente' }[ballot]}`}
            >
              <title>{`${deputyName(deputy.nombre)} · ${voteNames[ballot]}`}</title>
            </circle>
          ))}
        </svg>
      </div>
    ) : (
      <Empty>La fuente ofrece el recuento agregado, sin el voto individual.</Empty>
    );
  }
  return (
    <div className="cg-hemicycle">
      <svg
        viewBox={`-8 -8 ${index.hemiciclo.ancho + 16} ${index.hemiciclo.alto + 16}`}
        role="img"
        aria-label="Distribución actual de diputados en el hemiciclo; detalle en la lista de diputados"
      >
        {index.diputados.map(
          (deputy) =>
            deputy.x !== null &&
            deputy.y !== null &&
            !deputy.baja && (
              <circle
                key={deputy.nombre}
                cx={deputy.x}
                cy={deputy.y}
                r={4.2}
                fill={index.grupos[deputy.grupo]?.color}
                opacity={province && deputy.provincia !== province ? 0.15 : 1}
              >
                <title>{`${deputyName(deputy.nombre)} · ${deputy.grupo}`}</title>
              </circle>
            ),
        )}
      </svg>
      <div className="cg-legend">
        {Object.entries(index.grupos)
          .filter(([, g]) => g.escanos)
          .map(([id, g]) => (
            <span key={id}>
              <i style={{ background: g.color }} />
              {id} <b>{g.escanos}</b>
            </span>
          ))}
      </div>
    </div>
  );
}
export function Deputies({
  index,
  deputies = index.diputados,
}: {
  index: CongressIndex;
  deputies?: CongressIndex['diputados'];
}) {
  if (!deputies.length) return <Empty />;
  return (
    <div className="cg-grid">
      {deputies.map((deputy) => (
        <Link
          className="cg-card cg-deputy"
          href={href(`diputado/${slug(deputy.nombre)}`)}
          key={deputy.nombre}
        >
          <span className="cg-avatar" style={{ borderColor: index.grupos[deputy.grupo]?.color }}>
            {deputyName(deputy.nombre)
              .split(' ')
              .map((part) => part.charAt(0))
              .slice(0, 2)
              .join('')}
          </span>
          <h3>{deputyName(deputy.nombre)}</h3>
          <p>{deputy.provincia}</p>
          <span className="cg-group">
            <i style={{ background: index.grupos[deputy.grupo]?.color }} />
            {deputy.grupo}
            {deputy.baja ? ' · De baja' : ''}
          </span>
        </Link>
      ))}
    </div>
  );
}
export function Filters({
  action,
  query,
  group,
  province,
  index,
  period,
}: {
  action: string;
  query: string;
  group?: string;
  province?: string;
  index?: CongressIndex;
  period?: string;
}) {
  return (
    <form className="cg-filters" action={action}>
      {period && <input type="hidden" name="periodo" value={period} />}
      <label>
        Buscar
        <input
          className="campo"
          name="q"
          defaultValue={query}
          type="search"
          placeholder="Nombre o tema"
          maxLength={200}
        />
      </label>
      {group !== undefined && index && (
        <label>
          Grupo
          <select className="campo" name="grupo" defaultValue={group}>
            <option value="">Todos</option>
            {Object.entries(index.grupos)
              .filter(([, g]) => g.escanos)
              .map(([id]) => (
                <option key={id}>{id}</option>
              ))}
          </select>
        </label>
      )}
      {province !== undefined && index && (
        <label>
          Provincia
          <select className="campo" name="provincia" defaultValue={province}>
            <option value="">Todas</option>
            {[...new Set(index.diputados.map((d) => d.provincia))]
              .filter(Boolean)
              .sort((a, b) => a.localeCompare(b, 'es'))
              .map((p) => (
                <option key={p}>{p}</option>
              ))}
          </select>
        </label>
      )}
      <Button type="submit" variant="secondary">
        Buscar <Icon name="buscar" size={16} />
      </Button>
    </form>
  );
}
export function Pagination({
  page,
  total,
  params,
}: {
  page: number;
  total: number;
  params: Record<string, string>;
}) {
  const url = (next: number) => `?${new URLSearchParams({ ...params, pagina: String(next) })}`;
  const pages = Math.ceil(total / 24);
  return (
    pages > 1 && (
      <nav className="cg-pagination" aria-label="Paginación">
        {page > 1 && (
          <Link className="boton-claro" href={url(page - 1)}>
            <Icon name="izquierda" size={16} />
            Anterior
          </Link>
        )}
        <span>
          Página {page} de {pages}
        </span>
        {page < pages && (
          <Link className="boton-claro" href={url(page + 1)}>
            Siguiente
            <Icon name="derecha" size={16} />
          </Link>
        )}
      </nav>
    )
  );
}
