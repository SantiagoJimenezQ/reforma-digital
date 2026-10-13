import type { Metadata } from 'next';
import { sources } from '@reforma-digital/government';
import { InfoPage } from '../../../components/brand/info-page';
import { Icon } from '../../../components/brand/icon';
import { SourcesMapPanel } from '../../../components/sources-map-panel';
import { JsonLd } from '../../../components/json-ld';
import { breadcrumbs, pageMetadata, webPage } from '../../../lib/seo';

const title = 'Fuentes oficiales del buscador de trámites · Reforma Digital';
const description =
  'Los organismos que consulta el buscador: BOE, Agencia Tributaria, Seguridad Social, DGT, SEPE, Comunidad y Ayuntamiento de Madrid, entre otros.';

export const metadata: Metadata = pageMetadata({
  title,
  description,
  path: '/sources',
  og: 'fuentes',
});

const graph = [
  webPage({
    type: 'CollectionPage',
    name: title,
    description,
    path: '/sources',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: sources.length,
      itemListElement: sources.map((s, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: { '@type': 'GovernmentOrganization', name: s.name, url: s.baseUrl },
      })),
    },
  }),
  breadcrumbs('Fuentes oficiales', '/sources'),
];

export default function Sources() {
  return (
    <InfoPage>
      <JsonLd graph={graph} />
      <span
        className={
          't-etiqueta [font-family:var(--font-brand-mono)] text-xs font-medium [line-height:1.3] [letter-spacing:0.08em] uppercase info-etiqueta block mb-4 [color:var(--text-secondary)]'
        }
      >
        INFORMACIÓN CON ORIGEN
      </span>
      <h1>Las fuentes importan.</h1>
      <p
        className={
          'info-entradilla [max-width:65ch] mb-10 [color:var(--text-secondary)] text-lg [line-height:1.6]'
        }
      >
        Un registro limitado de organismos oficiales. No buscamos en toda Internet: cada respuesta
        se construye a partir de documentos de estas fuentes aprobadas.
      </p>
      <SourcesMapPanel />
      <div
        className={
          'registry-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] [border-top:1px_solid_var(--border)] [border-left:1px_solid_var(--border)] [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_600px)]:[grid-template-columns:minmax(0,_1fr)]'
        }
      >
        {sources.map((s) => (
          <article
            className={
              'registry-card flex flex-col items-start gap-4 p-6 [border-right:1px_solid_var(--border)] [border-bottom:1px_solid_var(--border)] [&_h2]:[font-size:26px] [&_h2]:[line-height:1.2] [&_p]:text-sm [&_p]:[color:var(--text-secondary)] [&_a]:inline-flex [&_a]:items-center [&_a]:gap-2 [&_a]:min-h-11 [&_a]:[margin-top:auto] [&_a]:text-sm [&_a]:[text-decoration:underline] [&_a]:[text-underline-offset:0.2em]'
            }
            key={s.id}
          >
            <Icon name="fuentes" size={24} />
            <h2>{s.name}</h2>
            <p>
              {s.jurisdictionType === 'country'
                ? 'Ámbito estatal'
                : s.jurisdictionType === 'region'
                  ? 'Comunidad de Madrid'
                  : 'Municipio de Madrid'}
            </p>
            <span className={'registry-meta text-sm [color:var(--text-secondary)]'}>
              Fuente aprobada · Web oficial
              <br />
              Consultada mediante búsqueda web
            </span>
            <a href={s.baseUrl} target="_blank" rel="noopener noreferrer">
              Visitar organismo <Icon name="derecha" size={16} />
            </a>
          </article>
        ))}
      </div>
      <div
        className={
          'info-prosa [&_h2]:[margin-block:40px_16px] [&_h2]:[font-size:clamp(24px,_3vw,_32px)] [&_h2]:[line-height:1.2] [&_p]:my-4 [&_p]:[color:var(--text-secondary)] [max-width:65ch] mt-12'
        }
      >
        <h2>Las respuestas dependen de la evidencia disponible.</h2>
        <p>
          Buscamos en la web de estos organismos para cada consulta. Si la información recuperada no
          basta, el buscador lo indica. La fecha de consulta y el fragmento utilizado se muestran en
          cada cita.
        </p>
      </div>
    </InfoPage>
  );
}
