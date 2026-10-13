'use client';
import { Button } from '@reforma-digital/design/ui/button';

import { sources } from '@reforma-digital/government';
import { Icon } from './brand/icon';
import { sourceBand, sourceCoverage } from '../lib/source-coverage';

const coverage = sourceCoverage(sources);
const bands = ['0 fuentes', '1–2 fuentes', '3–5 fuentes', '6 o más fuentes'];

export default function SourcesMap({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const selected = coverage.regions.find((region) => region.id === selectedId);

  return (
    <section
      className={
        "sources-map [&_h2]:pr-14 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-medium [&_h2]:[line-height:1.3] [&_a:not(.sources-map-region)]:[text-decoration:underline] [&_a:not(.sources-map-region)]:[text-underline-offset:3px] [&_[data-band='0']]:[fill:rgb(var(--bg-danger-line))] [&_[data-band='0']]:[background:rgb(var(--bg-danger-line))] [&_[data-band='1']]:[fill:rgb(var(--bg-warning-line))] [&_[data-band='1']]:[background:rgb(var(--bg-warning-line))] [&_[data-band='2']]:[fill:rgb(var(--bg-success-line))] [&_[data-band='2']]:[background:rgb(var(--bg-success-line))] [&_[data-band='3']]:[fill:rgb(var(--bg-success-fg))] [&_[data-band='3']]:[background:rgb(var(--bg-success-fg))]"
      }
      aria-labelledby="sources-map-title"
    >
      <h2 id="sources-map-title">Fuentes por territorio</h2>
      <p className={'sources-map-intro [max-width:70ch] text-base [line-height:1.6]'}>
        Cada zona muestra cuántas fuentes oficiales habilitadas tenemos registradas. Contamos
        organismos, no documentos ni trámites; su presencia no garantiza una respuesta.
      </p>
      <p className={'sources-map-national mt-4 text-base [line-height:1.6]'}>
        <strong>{coverage.national.length} fuentes estatales</strong> para toda España, además de
        las territoriales. <a href="/sources">Ver todas las fuentes</a>.
      </p>

      <div
        className={
          'sources-map-content grid [grid-template-columns:minmax(0,_2fr)_minmax(0,_1fr)] items-start gap-8 mt-6 [@media(max-width:_800px)]:[grid-template-columns:minmax(0,_1fr)] [@media(max-width:_800px)]:gap-6'
        }
      >
        <div>
          <svg
            className={'sources-map-svg block w-full h-auto'}
            viewBox="0 0 600 520"
            role="group"
            aria-labelledby="sources-map-graphic-title sources-map-graphic-description"
          >
            <title id="sources-map-graphic-title">Fuentes por comunidad y ciudad autónoma</title>
            <desc id="sources-map-graphic-description">
              Elige una zona para ver sus fuentes. También puedes usar los botones bajo el mapa.
              Canarias está representada en un recuadro separado.
            </desc>
            <rect
              className={'sources-map-inset [fill:none] [stroke:rgb(var(--bg-line-strong))]'}
              x="12"
              y="420"
              width="180"
              height="94"
            />
            <text
              className={
                'sources-map-label [fill:rgb(var(--bg-ink-muted))] text-sm [@media(max-width:_640px)]:[font-size:32px]'
              }
              x="24"
              y="411"
              aria-hidden="true"
            >
              Canarias
            </text>
            {coverage.regions.map((region) => (
              <a
                key={region.id}
                href="#sources-map-detail"
                className={
                  "sources-map-region cursor-pointer [&_path]:[stroke:rgb(var(--bg-ink))] [&_path]:[stroke-width:1px] [&_path[data-band='3']]:[stroke:rgb(var(--bg-surface))] [&[aria-current]_path]:[stroke:rgb(var(--bg-brand-600))] [&[aria-current]_path]:[stroke-width:3px] [&[aria-current]_path]:[stroke-dasharray:4_2] [&[aria-current]_path[data-band='3']]:[stroke:rgb(var(--bg-surface))] [&:focus-visible]:[outline:3px_solid_rgb(var(--bg-brand-600))] [&:focus-visible]:[outline-offset:2px] [&:focus-visible_path]:[stroke-width:3px] [@media(hover:_hover)_and_(pointer:_fine)]:[&:hover_path]:[stroke-width:3px] [&_.sources-map-label]:[text-decoration:underline]"
                }
                aria-label={`${region.name}: ${region.sources.length} fuentes`}
                aria-current={selectedId === region.id ? 'true' : undefined}
                aria-controls="sources-map-detail"
                onClick={(event) => {
                  event.preventDefault();
                  onSelect(region.id);
                }}
              >
                {region.id === 'ES-CE' && (
                  <rect x="180" y="405" width="100" height="100" fill="transparent" />
                )}
                {region.id === 'ES-ML' && (
                  <rect x="283" y="420" width="100" height="100" fill="transparent" />
                )}
                <path
                  d={region.path}
                  data-band={sourceBand(region.sources.length)}
                  fillRule="evenodd"
                  vectorEffect="non-scaling-stroke"
                >
                  <title>{`${region.name}: ${region.sources.length} fuentes`}</title>
                </path>
                {region.id === 'ES-CE' && (
                  <text
                    className={
                      'sources-map-label [fill:rgb(var(--bg-ink-muted))] text-sm [@media(max-width:_640px)]:[font-size:32px]'
                    }
                    x="202"
                    y="433"
                    aria-hidden="true"
                  >
                    Ceuta
                  </text>
                )}
                {region.id === 'ES-ML' && (
                  <text
                    className={
                      'sources-map-label [fill:rgb(var(--bg-ink-muted))] text-sm [@media(max-width:_640px)]:[font-size:32px]'
                    }
                    x="294"
                    y="464"
                    aria-hidden="true"
                  >
                    Melilla
                  </text>
                )}
              </a>
            ))}
          </svg>
          <ul
            className={
              'sources-map-legend flex flex-wrap [gap:12px_24px] [margin:16px_0_0] p-0 list-none text-sm [&_li]:flex [&_li]:items-center [&_li]:gap-2'
            }
            aria-label="Fuentes registradas por zona"
          >
            {bands.map((label, band) => (
              <li key={label}>
                <span
                  className={
                    'sources-map-swatch w-5 h-5 [border:1px_solid_rgb(var(--bg-line-control))]'
                  }
                  data-band={band}
                  aria-hidden="true"
                />
                {label}
              </li>
            ))}
          </ul>
          <p className={'sources-map-credit mt-4 text-sm [line-height:1.5]'}>
            Cartografía: Instituto Geográfico Nacional, vía{' '}
            <a href="https://www.geoboundaries.org/">geoBoundaries</a>.{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Geometría
            simplificada y adaptada.
          </p>
        </div>

        <div
          id="sources-map-detail"
          className={
            'sources-map-detail p-6 [border-radius:var(--bg-radius-card)] [background:rgb(var(--bg-surface-muted))] text-base [line-height:1.6] [&_h3]:m-0 [&_h3]:[color:rgb(var(--bg-ink))] [&_h3]:[font-size:20px] [&_h3]:font-semibold [&_p_+_p]:mt-3 [&_h3_+_p]:mt-3 [&_ul]:grid [&_ul]:gap-3 [&_ul]:[margin:16px_0_0] [&_ul]:pl-5 [&_a]:[overflow-wrap:anywhere] [@media(max-width:_800px)]:p-4'
          }
          aria-live="polite"
          aria-atomic
        >
          {selected ? (
            <>
              <h3>{selected.name}</h3>
              <p>
                {selected.sources.length}{' '}
                {selected.sources.length === 1
                  ? 'fuente territorial registrada'
                  : 'fuentes territoriales registradas'}
              </p>
              {selected.sources.length ? (
                <ul>
                  {selected.sources.map((source) => (
                    <li key={source.id}>
                      <a
                        href={source.baseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={
                          'enlace [color:var(--link)] [text-decoration-line:underline] [text-decoration-thickness:from-font] [text-underline-offset:0.2em]'
                        }
                      >
                        {source.name} <Icon name="derecha" size={16} />
                        <span
                          className={
                            'sr-only absolute [width:1px] [height:1px] p-0 [margin:-1px] overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap border-0'
                          }
                        >
                          {' '}
                          (se abre en una pestaña nueva)
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Todavía no tenemos fuentes autonómicas o municipales registradas aquí.</p>
              )}
            </>
          ) : (
            <p>Elige una comunidad o ciudad autónoma para ver sus fuentes oficiales.</p>
          )}
        </div>
      </div>

      <ul
        className={
          'sources-map-list grid [grid-template-columns:repeat(4,_minmax(0,_1fr))] gap-2 p-0 [margin:24px_0_0] list-none [&_button]:justify-between [&_button]:gap-2 [&_button]:w-full [&_button]:h-auto [&_button]:text-left [&_button]:[white-space:normal] [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]'
        }
        aria-label="Comunidades y ciudades autónomas"
      >
        {coverage.regions.map((region) => (
          <li key={region.id}>
            <Button
              type="button"
              aria-pressed={selectedId === region.id}
              aria-controls="sources-map-detail"
              onClick={() => onSelect(region.id)}
              variant={selectedId === region.id ? 'secondary' : 'ghost'}
            >
              <span>{region.name}</span>
              <span>
                {region.sources.length}
                <span
                  className={
                    'sr-only absolute [width:1px] [height:1px] p-0 [margin:-1px] overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap border-0'
                  }
                >
                  {' '}
                  fuentes
                </span>
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
