import { Button, Surface, Tabs, Disclosure } from '@reforma-digital/design/sol';
import { Icon } from '../sol/icon';
import {
  projectionSchema,
  marketsSchema,
  accuracySchema,
  mapSchema,
  historicalProvinceSchema,
  municipalitiesSchema,
} from '../../lib/congreso/schema';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getElections,
  getHistory,
  getPolls,
  getGeography,
  read,
  slug,
} from '../../lib/congreso/data';
import { pollsHidden } from '../../lib/congreso/polls';
import {
  Intro,
  Section,
  Stats,
  Source,
  Filters,
  Pagination,
  Empty,
  date,
  href,
  number,
} from './common';
import { Coalition } from './coalition';
import { Dhondt } from './dhondt';
import { ElectionContext } from './election-context';

const electionPages = [
  ['caducan', 'Lo que caduca'],
  ['legislatura', 'En cifras'],
  ['repite', 'Quién repite'],
  ['metricas', 'Métricas'],
  ['mapa', 'Municipios'],
  ['voto', 'Geografía del voto'],
  ['noche', 'La noche electoral'],
  ['calendario', 'Calendario'],
  ['350', 'Los 350'],
  ['historico', 'Desde 1977'],
  ['escano', 'Precio del escaño'],
  ['encuestas', 'Encuestas'],
  ['proyeccion', 'Proyección'],
  ['mercados', 'Mercados'],
  ['acierto', 'Cuánto acertaron'],
];

export async function Geography({
  detail,
  query,
  page,
}: {
  detail?: string;
  query: string;
  page: number;
}) {
  const geography = await getGeography();
  const map = await read('elecciones/geo-provincias.json', mapSchema);
  const selected = detail
    ? Object.entries(geography.provincias).find(([id, p]) => id === detail || slug(p.n) === detail)
    : undefined;
  if (detail && !selected && detail !== 'municipios') notFound();
  if (detail === 'municipios') {
    const data = await read('geografia/municipios.json', municipalitiesSchema);
    const municipalities = Object.entries(data.m).filter(([, m]) =>
      m[0].toLowerCase().includes(query.toLowerCase()),
    );
    return (
      <>
        <Intro title="Municipio a municipio">
          <p>
            Datos del INE · población de {data.anio}. Los años de renta y edad pueden ser distintos.
          </p>
        </Intro>
        <Filters action={href('geografia/municipios')} query={query} />
        <div className="cg-table">
          <table>
            <thead>
              <tr>
                <th>Municipio</th>
                <th>Población</th>
                <th>Renta por persona</th>
                <th>Edad media</th>
              </tr>
            </thead>
            <tbody>
              {municipalities.slice((page - 1) * 24, page * 24).map(([id, m]) => (
                <tr key={id}>
                  <th>{m[0]}</th>
                  <td>{number(m[4])}</td>
                  <td>{m[6] === null ? '—' : `${number(m[6])} €`}</td>
                  <td>{m[7] ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={municipalities.length} params={{ q: query }} />
      </>
    );
  }
  const provinces = selected
    ? [selected]
    : Object.entries(geography.provincias).filter(([, p]) =>
        p.n.toLowerCase().includes(query.toLowerCase()),
      );
  return (
    <>
      {selected && (
        <Intro title={selected[1].n}>
          <p>Población, renta, edad y representación, con datos del INE y del Congreso.</p>
        </Intro>
      )}
      <div className="cg-geo-hero">
        <svg
          viewBox={`0 0 ${map.ancho} ${map.alto}`}
          aria-label="Provincias de España; selecciona una para consultar sus datos"
          role="img"
        >
          {Object.entries(map.provincias).map(([id, p]) => (
            <a href={href(`geografia/${id}`)} key={id} aria-label={p.n}>
              <path
                d={p.d}
                fill={selected && selected[0] !== id ? 'var(--superficie)' : 'var(--rojo)'}
                stroke="var(--blanco)"
                strokeWidth={0.6}
              >
                <title>{p.n}</title>
              </path>
            </a>
          ))}
        </svg>
        <div>
          <h2>Tu provincia, a escala</h2>
          <p>
            El mapa enlaza a las mismas fichas que la lista. Los datos no describen la situación de
            cada persona.
          </p>
          <Button asChild variant="secondary">
            <Link href={href('geografia/municipios')}>Consultar los municipios</Link>
          </Button>
          <Source url="https://www.ine.es/">Instituto Nacional de Estadística</Source>
        </div>
      </div>
      <Filters action={href('geografia')} query={query} />
      <div className="cg-grid">
        {provinces.map(([id, p]) => (
          <Surface asChild key={id}>
            <article className="cg-card">
              <h2>
                <Link href={href(`geografia/${id}`)}>{p.n}</Link>
              </h2>
              <Stats
                items={[
                  [p.pob, 'Habitantes'],
                  [p.esc, 'Escaños'],
                  [`${number(p.renta)} €`, 'Renta por persona'],
                  [p.edad, 'Edad media'],
                  [p.dens, 'Habitantes / km²'],
                ]}
              />
            </article>
          </Surface>
        ))}
      </div>
      <p className="cg-muted">
        Años de referencia:{' '}
        {Object.entries(geography.fuentes)
          .map(([name, year]) => `${name}: ${year}`)
          .join(' · ')}
      </p>
    </>
  );
}

function ElectionNav({ selected }: { selected: string }) {
  return (
    <Tabs label="Elecciones">
      {electionPages.map(([id, title]) => (
        <Button asChild variant="ghost" key={id}>
          <Link href={href(`elecciones/${id}`)} aria-current={selected === id ? 'page' : undefined}>
            {title}
          </Link>
        </Button>
      ))}
    </Tabs>
  );
}

export async function Elections({
  detail,
  query,
  page,
}: {
  detail?: string;
  query: string;
  page: number;
}) {
  if (detail === 'escano')
    return (
      <>
        <Intro title="Cómo se reparte un escaño" />
        <ElectionNav selected="escano" />
        <Dhondt />
        <Source url="https://www.boe.es/buscar/act.php?id=BOE-A-1985-11672">
          Ley Orgánica del Régimen Electoral General
        </Source>
      </>
    );
  const election = await getElections();
  const selected = detail || 'calendario';
  if (['caducan', 'legislatura', 'repite', 'metricas', 'mapa', 'voto', 'noche'].includes(selected))
    return <ElectionContext detail={selected} query={query} page={page} />;
  const nav = <ElectionNav selected={selected} />;
  if (['encuestas', 'proyeccion', 'mercados', 'acierto'].includes(selected)) {
    const polls = await getPolls();
    if (pollsHidden(polls.veda))
      return (
        <>
          <Intro title="Encuestas temporalmente ocultas" />
          <p>La publicación está restringida durante el periodo indicado en la fuente.</p>
          {nav}
        </>
      );
    if (selected === 'proyeccion') {
      const data = await read('encuestas/proyeccion.json', projectionSchema);
      const geography = await getGeography();
      return (
        <>
          <Intro title="Los escaños de la media">
            <p>
              Proyección calculada el {date(data.fecha)}. Es una estimación, no un resultado
              electoral.
            </p>
          </Intro>
          {nav}
          <Coalition seats={data.central} />
          <Section title="Reparto central">
            <Stats
              items={Object.entries(data.central)
                .sort(([, a], [, b]) => b - a)
                .map(([id, n]) => [n, id])}
            />
          </Section>
          <Section title="Provincia a provincia">
            <div className="cg-grid">
              {Object.entries(data.provincias).map(([id, seats]) => (
                <Surface asChild key={id}>
                  <article className="cg-card">
                    <h3>{geography.provincias[id]?.n || id}</h3>
                    <p>
                      {Object.entries(seats)
                        .map(([p, n]) => `${p}: ${n}`)
                        .join(' · ')}
                    </p>
                  </article>
                </Surface>
              ))}
            </div>
          </Section>
        </>
      );
    }
    if (selected === 'mercados') {
      const data = await read('encuestas/mercados.json', marketsSchema);
      return (
        <>
          <Intro title="Lo que apuestan los mercados">
            <p>Precios de apuestas: no son encuestas ni probabilidades verificadas.</p>
          </Intro>
          {nav}
          <div className="cg-grid">
            {data.mercados.map((market) => (
              <Surface asChild key={market.slug}>
                <article className="cg-card">
                  <h2>{market.pregunta}</h2>
                  <Stats
                    items={market.opciones.map((o) => [`${(o.p * 100).toFixed(1)} %`, o.nombre])}
                  />
                  <Source url={market.url}>Polymarket</Source>
                </article>
              </Surface>
            ))}
          </div>
        </>
      );
    }
    if (selected === 'acierto') {
      const data = await read('encuestas/aciertos.json', accuracySchema);
      return (
        <>
          <Intro title="Cuánto acertaron las encuestas" />
          {nav}
          <div className="cg-grid">
            {data.elecciones.map((e) => (
              <Surface asChild key={e.id}>
                <article className="cg-card">
                  <h2>{e.nombre}</h2>
                  <p>Error absoluto medio: {e.media_mae} puntos</p>
                  <div className="cg-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Partido</th>
                          <th>Media</th>
                          <th>Resultado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(e.resultado).map(([p, n]) => (
                          <tr key={p}>
                            <th>{p}</th>
                            <td>{e.media[p]} %</td>
                            <td>{n} %</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              </Surface>
            ))}
          </div>
        </>
      );
    }
    const filtered = polls.encuestas.filter((e) =>
      e.empresa.toLowerCase().includes(query.toLowerCase()),
    );
    return (
      <>
        <Intro title="Las encuestas">
          <p>
            Datos recopilados hasta el {date(polls.actualizado)}. Cada encuesta es una estimación
            con incertidumbre.
          </p>
        </Intro>
        {nav}
        <Source url={polls.fuente}>Tabla de origen en Wikipedia</Source>
        <Filters action={href('elecciones/encuestas')} query={query} />
        <div className="cg-grid">
          {filtered.slice((page - 1) * 24, page * 24).map((e, i) => (
            <Surface asChild key={i}>
              <article className="cg-card">
                <h3>{e.empresa}</h3>
                <p>
                  {date(e.ini)} → {date(e.fin)} · muestra {e.n ?? 'no publicada'}
                </p>
                <dl className="cg-poll">
                  {Object.entries(e.v).map(([p, n]) => (
                    <div key={p}>
                      <dt>{p}</dt>
                      <dd>
                        <span
                          style={{
                            width: `${n * 2}%`,
                            background: polls.partidos.find((party) => party.id === p)?.color,
                          }}
                          aria-hidden="true"
                        />
                        {n} %
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            </Surface>
          ))}
        </div>
        <Pagination page={page} total={filtered.length} params={{ q: query }} />
      </>
    );
  }
  if (selected === '350') {
    const geography = await getGeography();
    return (
      <>
        <Intro title="Cada escaño sale de una provincia" />
        {nav}
        <div className="cg-grid">
          {Object.entries(election.escanos).map(([id, n]) => (
            <Surface asChild key={id}>
              <article className="cg-card">
                <h2>{geography.provincias[id]?.n || id}</h2>
                <Stats items={[[n, 'Escaños']]} />
                <Link href={href(`geografia/${id}`)}>Ver la provincia</Link>
              </article>
            </Surface>
          ))}
        </div>
      </>
    );
  }
  if (selected === 'historico' || /^\d{6}$/.test(selected)) {
    const history = await getHistory();
    const data = /^\d{6}$/.test(selected)
      ? history.elecciones.find((e) => e.id === selected)
      : undefined;
    if (/^\d{6}$/.test(selected) && !data) notFound();
    if (data) {
      const provinces = await read(
        `elecciones/historico-${data.id}.json`,
        historicalProvinceSchema,
      );
      const geography = await getGeography();
      return (
        <>
          <Intro title={`Elecciones del ${date(data.fecha)}`} />
          {nav}
          <Stats
            items={[
              [data.censo, 'Censo'],
              [data.votantes, 'Votantes'],
            ]}
          />
          <Section title="Resultados nacionales">
            <div className="cg-table">
              <table>
                <thead>
                  <tr>
                    <th>Candidatura</th>
                    <th>Votos</th>
                    <th>Escaños</th>
                  </tr>
                </thead>
                <tbody>
                  {data.partidos.map(([id, name, , votes, seats]) => (
                    <tr key={`${id}-${name}`}>
                      <th>{name}</th>
                      <td>{number(votes)}</td>
                      <td>{seats}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
          <Section title="Por provincia">
            <div className="cg-grid">
              {Object.entries(provinces.prov).map(([id, p]) => (
                <Surface asChild key={id}>
                  <Disclosure
                    className="cg-card"
                    title={
                      <>
                        {geography.provincias[id]?.n || id} · {p.e} escaños
                      </>
                    }
                    icon={<Icon name="abajo" size={16} />}
                  >
                    <p>{number(p.sin_escano)} votos a candidaturas sin escaño</p>
                    <ul>
                      {p.c.map(([name, , votes, seats]) => (
                        <li key={name}>
                          {name}: {number(votes)} votos · {seats} escaños
                        </li>
                      ))}
                    </ul>
                  </Disclosure>
                </Surface>
              ))}
            </div>
          </Section>
        </>
      );
    }
    return (
      <>
        <Intro title="Elecciones desde 1977" />
        {nav}
        <div className="cg-grid">
          {history.elecciones
            .slice()
            .reverse()
            .map((e) => (
              <Surface asChild key={e.id}>
                <Link href={href(`elecciones/${e.id}`)} className="cg-card">
                  <h2>{date(e.fecha)}</h2>
                  <Stats
                    items={[
                      [e.votantes, 'Votantes'],
                      [`${((e.votantes / e.censo) * 100).toFixed(1)} %`, 'Participación'],
                    ]}
                  />
                </Link>
              </Surface>
            ))}
        </div>
      </>
    );
  }
  if (selected !== 'calendario') notFound();
  return (
    <>
      <Intro label="Elecciones" title={`Camino al ${date(election.votacion)}`}>
        <p>Calendario y datos de la convocatoria recogida por Escaño Abierto.</p>
      </Intro>
      {nav}
      <Source
        url={`https://www.boe.es/diario_boe/txt.php?id=${encodeURIComponent(election.decreto.boe)}`}
      >
        {election.decreto.rd}
      </Source>
      <Section title="Las fechas">
        <ol className="cg-timeline">
          {election.calendario.map((milestone) => (
            <li key={`${milestone.fecha}-${milestone.hito}`}>
              <time dateTime={milestone.fecha}>{date(milestone.fecha)}</time>
              <h3>{milestone.hito}</h3>
              {milestone.detalle && <p>{milestone.detalle}</p>}
            </li>
          ))}
        </ol>
      </Section>
      <Section title="Explora las elecciones">
        <div className="cg-grid">
          {electionPages.slice(1).map(([id, title]) => (
            <Surface asChild key={id}>
              <Link className="cg-card" href={href(`elecciones/${id}`)}>
                <h2>{title}</h2>
                <span>Consultar →</span>
              </Link>
            </Surface>
          ))}
        </div>
      </Section>
    </>
  );
}
