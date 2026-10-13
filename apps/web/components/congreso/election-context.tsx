import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@reforma-digital/design/ui/table';
import { Card, CardContent } from '@reforma-digital/design/ui/card';

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
        <div
          className={
            'cg-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-5 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_560px)]:[grid-template-columns:1fr]'
          }
        >
          {laws
            .slice((page - 1) * 24, page * 24)
            .map(([exp, title, type, , authors, presented, , extensions, days, commission]) => (
              <Card
                key={exp}
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
                    {type} · {authors.join(', ')}
                  </span>
                  <h3>{title}</h3>
                  <p>
                    Presentada el {date(presented)} · {days} días · {extensions} ampliaciones
                  </p>
                  <p>{commission}</p>
                  <Source url={congressUrl(exp, 'XV')}>Expediente</Source>
                </CardContent>
              </Card>
            ))}
        </div>
        <Pagination page={page} total={laws.length} params={{ q: query }} />
        <Section title="Decretos pendientes de convalidar">
          <div
            className={
              'cg-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-5 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_560px)]:[grid-template-columns:1fr]'
            }
          >
            {source.convalidar.map((d) => (
              <Card
                key={d.numero}
                render={
                  <article
                    className={
                      'cg-card [overflow-wrap:anywhere] [&_h2]:[font-size:28px] [&_h3]:text-lg [&_h3]:[line-height:1.3] [&_h3]:[margin:12px_0] [&_p]:[color:var(--text-secondary)] [&_p]:[margin:12px_0] [&_.cg-stats]:gap-5 [&_.cg-stats_dd]:[font-size:28px] [&_.cg-stats_dt]:[max-width:14ch]'
                    }
                  />
                }
              >
                <CardContent>
                  <h3>{d.titulo}</h3>
                  <p>Plazo aproximado: {date(d.limite_aprox)}</p>
                  <Source url={d.pdf}>Texto oficial</Source>
                </CardContent>
              </Card>
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
        <div
          className={
            'cg-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-5 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_560px)]:[grid-template-columns:1fr]'
          }
        >
          {history.elecciones
            .slice()
            .reverse()
            .map((e) => (
              <Card
                key={e.id}
                render={
                  <article
                    className={
                      'cg-card [overflow-wrap:anywhere] [&_h2]:[font-size:28px] [&_h3]:text-lg [&_h3]:[line-height:1.3] [&_h3]:[margin:12px_0] [&_p]:[color:var(--text-secondary)] [&_p]:[margin:12px_0] [&_.cg-stats]:gap-5 [&_.cg-stats_dd]:[font-size:28px] [&_.cg-stats_dt]:[max-width:14ch]'
                    }
                  />
                }
              >
                <CardContent>
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
                </CardContent>
              </Card>
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
        <div
          className={
            'cg-table overflow-x-auto [&_table]:[border-collapse:collapse] [&_table]:w-full [&_table]:text-left [&_th]:p-3 [&_th]:[border-bottom:1px_solid_var(--border)] [&_th]:[vertical-align:top] [&_td]:p-3 [&_td]:[border-bottom:1px_solid_var(--border)] [&_td]:[vertical-align:top] [&_th]:text-sm'
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Municipio</TableHead>
                <TableHead>Participación</TableHead>
                {votes.orden.map((p) => (
                  <TableHead key={p}>{p}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {places.slice((page - 1) * 24, page * 24).map(([id, row]) => (
                <TableRow key={id}>
                  <TableHead>{String(names.m[id]?.[0] || id)}</TableHead>
                  <TableCell>
                    {row[0] ? `${(((row[1] ?? 0) / row[0]) * 100).toFixed(1)} %` : '—'}
                  </TableCell>
                  {votes.orden.map((p, i) => (
                    <TableCell key={p}>{number(row[i + 2] ?? 0)}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
          <div
            className={
              'cg-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-5 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_560px)]:[grid-template-columns:1fr]'
            }
          >
            {age.edades.map((label, i) => (
              <Card
                key={label}
                render={
                  <article
                    className={
                      'cg-card [overflow-wrap:anywhere] [&_h2]:[font-size:28px] [&_h3]:text-lg [&_h3]:[line-height:1.3] [&_h3]:[margin:12px_0] [&_p]:[color:var(--text-secondary)] [&_p]:[margin:12px_0] [&_.cg-stats]:gap-5 [&_.cg-stats_dd]:[font-size:28px] [&_.cg-stats_dt]:[max-width:14ch]'
                    }
                  />
                }
              >
                <CardContent>
                  <h3>{label}</h3>
                  <Stats
                    items={Object.entries(age.ajustado[i] || {}).map(([p, n]) => [`${n} %`, p])}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
          <Source url={age.url}>Estudio de origen</Source>
        </Section>
        <Section title="El territorio">
          <div
            className={
              'cg-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-5 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_560px)]:[grid-template-columns:1fr]'
            }
          >
            {Object.entries(geography.provincias).map(([id, p]) => (
              <Card
                key={id}
                render={
                  <Link
                    className={
                      'cg-card [overflow-wrap:anywhere] [&_h2]:[font-size:28px] [&_h3]:text-lg [&_h3]:[line-height:1.3] [&_h3]:[margin:12px_0] [&_p]:[color:var(--text-secondary)] [&_p]:[margin:12px_0] [&_.cg-stats]:gap-5 [&_.cg-stats_dd]:[font-size:28px] [&_.cg-stats_dt]:[max-width:14ch]'
                    }
                    href={href(`geografia/${id}`)}
                  />
                }
              >
                <CardContent>
                  <h3>{p.n}</h3>
                  <p>
                    {number(p.renta)} € por persona · {p.edad} años de edad media · {p.dens}{' '}
                    habitantes/km²
                  </p>
                </CardContent>
              </Card>
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
