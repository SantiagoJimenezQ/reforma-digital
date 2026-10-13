import {
  balanceSchema,
  metricsSchema,
  municipalityVotesSchema,
  municipalityNamesSchema,
  ageSchema,
} from '../../lib/congreso/schema';
import Link from 'next/link';
import { getElections, read, congressUrl, getGeography } from '../../lib/congreso/data';
import {
  Intro,
  Section,
  Stats,
  Source,
  Empty,
  Filters,
  Pagination,
  date,
  href,
  number,
} from './common';

export async function ElectionContext({
  detail,
  query,
  page,
}: {
  detail: string;
  query: string;
  page: number;
}) {
  const election = await getElections();
  const source = await read('elecciones/elecciones.json', balanceSchema);
  const nav = (
    <p>
      <Link href={href('elecciones')}>← Todos los apartados de las elecciones</Link>
    </p>
  );
  if (detail === 'caducan') {
    const laws = source.caducan.lista.filter((law) =>
      law[1].toLowerCase().includes(query.toLowerCase()),
    );
    return (
      <>
        {nav}
        <Intro title="Lo que queda a medio camino">
          <p>
            Iniciativas que la disolución deja pendientes, según el registro de la convocatoria.
          </p>
        </Intro>
        <Stats
          items={[
            [source.caducan.total, 'Iniciativas'],
            [source.caducan.proyectos, 'Proyectos de ley'],
            [source.caducan.proposiciones, 'Proposiciones de ley'],
          ]}
        />
        <Filters action={href('elecciones/caducan')} query={query} />
        <div className="cg-grid">
          {laws
            .slice((page - 1) * 24, page * 24)
            .map(([exp, title, type, , authors, presented, , extensions, days, commission]) => (
              <article className="cg-card" key={exp}>
                <span className="t-etiqueta">
                  {type} · {authors.join(', ')}
                </span>
                <h3>{title}</h3>
                <p>
                  Presentada el {date(presented)} · {days} días · {extensions} ampliaciones
                </p>
                <p>{commission}</p>
                <Source url={congressUrl(exp, 'XV')}>Expediente</Source>
              </article>
            ))}
        </div>
        <Pagination page={page} total={laws.length} params={{ q: query }} />
        <Section title="Decretos pendientes de convalidar">
          <div className="cg-grid">
            {source.convalidar.map((d) => (
              <article className="cg-card" key={d.numero}>
                <h3>{d.titulo}</h3>
                <p>Plazo aproximado: {date(d.limite_aprox)}</p>
                <Source url={d.pdf}>Texto oficial</Source>
              </article>
            ))}
          </div>
        </Section>
      </>
    );
  }
  if (detail === 'legislatura') {
    const b = source.balance;
    return (
      <>
        {nav}
        <Intro title="La legislatura en cifras">
          <p>
            {date(b.desde)} → {date(b.hasta)}
          </p>
        </Intro>
        <Stats
          items={[
            [b.plenos, 'Plenos'],
            [b.sesiones, 'Sesiones'],
            [b.votaciones, 'Votaciones'],
            [b.intervenciones, 'Intervenciones analizadas'],
            [b.leyes, 'Leyes'],
            [b.leyes_organicas, 'Leyes orgánicas'],
            [b.decretos_ley, 'Decretos-ley'],
            [b.preguntas, 'Preguntas escritas'],
            [b.sin_respuesta, 'Preguntas sin respuesta'],
          ]}
        />
        <p>
          Los recuentos describen los registros disponibles; no miden por sí solos la calidad del
          trabajo parlamentario.
        </p>
      </>
    );
  }
  if (detail === 'metricas') {
    const history = await read('elecciones/historico.json', metricsSchema);
    const labels: Record<string, string> = {
      participacion: 'Participación',
      nep: 'Número efectivo de partidos',
      gallagher: 'Desproporcionalidad (Gallagher)',
      volatilidad: 'Volatilidad',
      bipartidismo: 'Bipartidismo',
      sin_escano: 'Votos sin escaño',
    };
    return (
      <>
        {nav}
        <Intro title="Elecciones, comparadas">
          <p>Participación y métricas calculadas a partir de los resultados oficiales.</p>
        </Intro>
        <div className="cg-grid">
          {history.elecciones
            .slice()
            .reverse()
            .map((e) => (
              <article className="cg-card" key={e.id}>
                <h2>
                  <Link href={href(`elecciones/${e.id}`)}>{date(e.fecha)}</Link>
                </h2>
                <Stats
                  items={[
                    [`${((e.votantes / e.censo) * 100).toFixed(1)} %`, 'Participación'],
                    ...Object.entries(e.metricas).map(([k, n]): [number | string, string] => [
                      n === null ? '—' : number(n),
                      labels[k] || k.replaceAll('_', ' '),
                    ]),
                  ]}
                />
              </article>
            ))}
        </div>
      </>
    );
  }
  if (detail === 'mapa') {
    const [votes, names] = await Promise.all([
      read('elecciones/municipios-202307.json', municipalityVotesSchema),
      read('geografia/municipios.json', municipalityNamesSchema),
    ]);
    const places = Object.entries(votes.municipios).filter(([id]) =>
      String(names.m[id]?.[0] || id)
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
    return (
      <>
        {nav}
        <Intro title="El voto, municipio a municipio">
          <p>
            Resultados de 2023 por familias de candidaturas. Los grupos se explican en el método; no
            representan partidos idénticos a través del tiempo.
          </p>
        </Intro>
        <Filters action={href('elecciones/mapa')} query={query} />
        <div className="cg-table">
          <table>
            <thead>
              <tr>
                <th>Municipio</th>
                <th>Participación</th>
                {votes.orden.map((p) => (
                  <th key={p}>{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {places.slice((page - 1) * 24, page * 24).map(([id, row]) => (
                <tr key={id}>
                  <th>{String(names.m[id]?.[0] || id)}</th>
                  <td>{row[0] ? `${(((row[1] ?? 0) / row[0]) * 100).toFixed(1)} %` : '—'}</td>
                  {votes.orden.map((p, i) => (
                    <td key={p}>{number(row[i + 2] ?? 0)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={places.length} params={{ q: query }} />
        <Source url="https://infoelectoral.interior.gob.es/es/elecciones-celebradas/area-de-descargas/">
          Resultados del Ministerio del Interior
        </Source>
      </>
    );
  }
  if (detail === 'voto') {
    const age = await read('elecciones/voto-edad.json', ageSchema);
    const geography = await getGeography();
    return (
      <>
        {nav}
        <Intro title="La geografía del voto">
          <p>
            La edad, la renta y el territorio ayudan a describir agregados; no permiten inferir el
            voto de una persona.
          </p>
        </Intro>
        <Section title="Voto por edad">
          <p>{age.fuente}. Estimaciones ajustadas al resultado, no recuentos individuales.</p>
          <div className="cg-grid">
            {age.edades.map((label, i) => (
              <article className="cg-card" key={label}>
                <h3>{label}</h3>
                <Stats
                  items={Object.entries(age.ajustado[i] || {}).map(([p, n]) => [`${n} %`, p])}
                />
              </article>
            ))}
          </div>
          <Source url={age.url}>Estudio de origen</Source>
        </Section>
        <Section title="El territorio">
          <div className="cg-grid">
            {Object.entries(geography.provincias).map(([id, p]) => (
              <Link className="cg-card" href={href(`geografia/${id}`)} key={id}>
                <h3>{p.n}</h3>
                <p>
                  {number(p.renta)} € por persona · {p.edad} años de edad media · {p.dens}{' '}
                  habitantes/km²
                </p>
              </Link>
            ))}
          </div>
        </Section>
      </>
    );
  }
  if (detail === 'repite')
    return (
      <>
        {nav}
        <Intro title="Quién vuelve a presentarse" />
        <Empty>
          {source.hay.candidaturas
            ? 'Las listas están disponibles en los conjuntos públicos de la convocatoria.'
            : `Todavía no se han incorporado candidaturas para la convocatoria del ${date(election.votacion)}.`}
        </Empty>
        <Source url="https://www.boe.es/">Publicaciones oficiales en el BOE</Source>
      </>
    );
  return (
    <>
      {nav}
      <Intro title="La noche electoral" />
      <Empty>
        {source.hay.resultados
          ? 'Los resultados incorporados están disponibles en la API de datos de la convocatoria.'
          : 'El último snapshot no contiene resultados de esta convocatoria.'}
      </Empty>
      <Source url="https://infoelectoral.interior.gob.es/">Información electoral oficial</Source>
    </>
  );
}
