import { extraSchema } from '../../lib/congreso/schema';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import {
  getPeriod,
  getOrgans,
  read,
  slug,
  deputyName,
  getQuestions,
} from '../../lib/congreso/data';
import type { CongressIndex } from '../../lib/congreso/schema';
import {
  Intro,
  Section,
  Stats,
  Source,
  Votes,
  Empty,
  Deputies,
  Filters,
  Pagination,
  Hemicycle,
  date,
  href,
} from './common';
import { Interventions } from './activity';

const boeUrl = (id: string) => `https://www.boe.es/diario_boe/txt.php?id=${encodeURIComponent(id)}`;

export async function People({
  section,
  detail,
  index,
  period,
  query,
  group,
  province,
  page,
}: {
  section: string;
  detail?: string;
  index: CongressIndex;
  period: string;
  query: string;
  group: string;
  province: string;
  page: number;
}) {
  if (section === 'organigrama' || section === 'cargo') {
    const organs = await getOrgans();
    if (section === 'cargo') {
      const cargo = detail && organs.cargos[detail];
      if (!cargo) notFound();
      return (
        <>
          <Intro label={cargo.ministerio} title={cargo.cargo} />
          <Section title="Quién ha ocupado el cargo">
            <ol className="cg-timeline">
              {cargo.mandatos.map((m, i) => (
                <li key={i}>
                  <h3>{m.persona}</h3>
                  <p>
                    {m.desde ? date(m.desde) : 'Inicio no disponible'} → {m.hasta || 'Actualidad'}
                  </p>
                  {m.boe && <Source url={boeUrl(m.boe)}>Nombramiento en el BOE</Source>}
                </li>
              ))}
            </ol>
          </Section>
        </>
      );
    }
    const cargos = Object.entries(organs.cargos).filter(([, c]) =>
      `${c.cargo} ${c.ministerio} ${c.mandatos.map((m) => m.persona).join(' ')}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
    return (
      <>
        <Intro title="Quién ocupa cada cargo">
          <p>
            Nombramientos y ceses publicados en el BOE. Actualizado el {date(organs.actualizado)}.
          </p>
        </Intro>
        <Stats
          items={[
            [organs.cifras.cargos_ocupados, 'Cargos ocupados'],
            [organs.cifras.ministerios, 'Ministerios'],
            [organs.cifras.cambios_30, 'Cambios en 30 días'],
          ]}
        />
        <Filters action={href('organigrama')} query={query} />
        <div className="cg-grid">
          {cargos.slice((page - 1) * 24, page * 24).map(([id, cargo]) => (
            <Link className="cg-card" key={id} href={href(`cargo/${id}`)}>
              <span className="t-etiqueta">{cargo.ministerio}</span>
              <h3>{cargo.cargo}</h3>
              <p>{cargo.mandatos.find((m) => !m.hasta)?.persona || 'Vacante'}</p>
            </Link>
          ))}
        </div>
        <Pagination page={page} total={cargos.length} params={{ q: query }} />
      </>
    );
  }
  if (section === 'diputado') {
    const deputy = index.diputados.find((d) => slug(d.nombre) === detail);
    if (!deputy) notFound();
    const data = await getPeriod(period);
    const i = index.diputados.indexOf(deputy);
    const votes = data.votaciones.filter((v) => v.v.charAt(i) && v.v.charAt(i) !== '-');
    const interventions = data.intervenciones.filter(
      (iv) => slug(iv.orador) === slug(deputy.nombre.split(',')[0] || ''),
    );
    const extra = (await read('diputados-extra.json', extraSchema))[deputy.nombre];
    const questions = (await getQuestions()).diputados[String(i)];
    return (
      <>
        <Intro label={`${deputy.grupo} · ${deputy.provincia}`} title={deputyName(deputy.nombre)}>
          <p>
            {deputy.baja
              ? `De baja desde ${deputy.baja}`
              : 'Diputado en activo en el último registro'}
          </p>
        </Intro>
        <Stats
          items={[
            [votes.length, 'Votaciones en el periodo'],
            [interventions.length, 'Intervenciones analizadas'],
            [questions?.[0] ?? 0, 'Preguntas en la legislatura'],
          ]}
        />
        {deputy.codigo && (
          <Source
            url={`https://www.congreso.es/busqueda-de-diputados?p_p_id=diputados&p_p_lifecycle=0&_diputados_mostrarFicha=true&_diputados_codParlamentario=${encodeURIComponent(String(deputy.codigo))}&_diputados_legislatura=${index.meta.legislatura}`}
          >
            Ficha del Congreso
          </Source>
        )}
        {extra && (
          <>
            <Section title="Biografía">
              <p>{extra.bio}</p>
            </Section>
            <Section title="Comisiones">
              <ul className="cg-list">
                {extra.comisiones.map(([commission, role]) => (
                  <li key={`${commission}-${role}`}>
                    <b>{commission}</b>
                    <span>{role}</span>
                  </li>
                ))}
              </ul>
            </Section>
            {extra.intereses && (
              <Section title="Declaración de intereses">
                <p>Información del registro público del Congreso.</p>
                {Object.entries(extra.intereses).map(([label, value]) => (
                  <details className="cg-transcript" key={label}>
                    <summary>{label.replaceAll('_', ' ')}</summary>
                    {typeof value === 'string' ? (
                      <p>{value}</p>
                    ) : (
                      <ul>
                        {value.map((row, j) => (
                          <li key={j}>
                            {typeof row === 'string' ? row : row.filter(Boolean).join(' · ')}
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>
                ))}
              </Section>
            )}
          </>
        )}
        <Section title="Cómo votó">
          <div className="cg-list">
            {votes.slice((page - 1) * 24, page * 24).map((vote) => (
              <article key={vote.id}>
                <Link href={href(`votacion/${vote.id}`, vote.fecha.slice(0, 7))}>
                  {vote.titulo}
                </Link>
                <b>{{ S: 'Sí', N: 'No', A: 'Abstención', X: 'No vota' }[vote.v.charAt(i)]}</b>
              </article>
            ))}
          </div>
          <Pagination page={page} total={votes.length} params={{ periodo: period }} />
        </Section>
        <Section title="Qué dijo">
          <Interventions interventions={interventions.slice((page - 1) * 24, page * 24)} />
          <Pagination page={page} total={interventions.length} params={{ periodo: period }} />
        </Section>
      </>
    );
  }
  if (section === 'grupos') {
    const data = await getPeriod(period);
    return (
      <>
        <Intro title="Los grupos parlamentarios" />
        <Hemicycle index={index} />
        <div className="cg-grid">
          {Object.entries(index.grupos)
            .filter(([, g]) => g.escanos)
            .map(([id, g]) => (
              <article className="cg-card" key={id}>
                <span className="cg-group">
                  <i style={{ background: g.color }} />
                  {id}
                </span>
                <h2>{g.nombre}</h2>
                <Stats
                  items={[
                    [g.escanos, 'Escaños'],
                    [
                      data.intervenciones.filter((iv) => iv.g === id).length,
                      'Intervenciones analizadas',
                    ],
                  ]}
                />
                <Link href={`${href('diputados')}?grupo=${id}`}>Ver sus diputados</Link>
                <details>
                  <summary>Voto mayoritario del grupo</summary>
                  <ul className="cg-list">
                    {data.votaciones.slice(0, 12).map((v) => (
                      <li key={v.id}>
                        <Link href={href(`votacion/${v.id}`, v.fecha.slice(0, 7))}>{v.titulo}</Link>
                        <b>
                          {{ S: 'Sí', N: 'No', A: 'Abstención', X: 'No vota' }[
                            v.grupos[id] || ''
                          ] || 'Voto dividido'}
                        </b>
                      </li>
                    ))}
                  </ul>
                </details>
              </article>
            ))}
        </div>
      </>
    );
  }
  if (section === 'oradores') {
    const data = await getPeriod(period);
    const interventions = data.intervenciones.filter(
      (iv) =>
        `${iv.orador} ${iv.item} ${iv.temas.join(' ')}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (!group || iv.g === group),
    );
    return (
      <>
        <Intro title="Por orador">
          <p>Qué dijo cada persona, en qué contexto y con qué tono según el análisis.</p>
        </Intro>
        <Filters
          action={href('oradores')}
          query={query}
          group={group}
          index={index}
          period={period}
        />
        <Interventions interventions={interventions.slice((page - 1) * 24, page * 24)} />
        <Pagination
          page={page}
          total={interventions.length}
          params={{ q: query, grupo: group, periodo: period }}
        />
      </>
    );
  }
  const selectedProvince =
    section === 'provincia' && detail
      ? index.diputados.find((d) => slug(d.provincia) === detail)?.provincia
      : province;
  if (section === 'provincia' && detail && !selectedProvince) notFound();
  const deputies = index.diputados.filter(
    (d) =>
      (section === 'diputados' || !d.baja) &&
      (!selectedProvince || d.provincia === selectedProvince) &&
      (!group || d.grupo === group) &&
      `${d.nombre} ${d.provincia}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <Intro
        title={
          section === 'provincia'
            ? `Tus diputados${selectedProvince ? ` · ${selectedProvince}` : ''}`
            : 'Quién te representa'
        }
      >
        <p>Miembros actuales e históricos de la legislatura {index.meta.legislatura}.</p>
      </Intro>
      <Filters
        action={href(section)}
        query={query}
        group={group}
        province={selectedProvince || ''}
        index={index}
      />
      {section === 'provincia' && <Hemicycle index={index} province={selectedProvince} />}
      <Deputies index={index} deputies={deputies.slice((page - 1) * 24, page * 24)} />
      {!deputies.length && <Empty />}
      <Pagination
        page={page}
        total={deputies.length}
        params={{ q: query, grupo: group, provincia: selectedProvince || '' }}
      />
    </>
  );
}
