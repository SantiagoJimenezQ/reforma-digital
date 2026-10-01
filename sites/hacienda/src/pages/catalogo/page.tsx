import { useId, useMemo, useState } from 'react';
import { DomBridge, normalizedLabel, scrollToOfficial } from '@reforma-digital/bridge';
import { useBridge } from '@reforma-digital/react';
import type { SitePage } from '@reforma-digital/registry';
import { Callout, LinkButton, Panel, ProgressSteps, SearchField } from '@reforma-digital/design';
import pageStyles from '../../styles/theme.css?inline';
import { aeatLayout } from '../../components/panels';
import { OUT_OF_SCOPE_FROM, STEPS } from '../../components/steps';
import { catalogoBindings, type CatalogoBindings } from './bindings';

const WWW2 = 'https://www2.agenciatributaria.gob.es';

export const catalogoPage: SitePage = {
  id: 'catalogo',
  matches: (url) => url.origin === WWW2 && url.pathname === '/wlpl/TOCP-MUTE/ServiciosAsocCat',
  prepare(document, _url, restore) {
    const bindings = catalogoBindings(document);
    if (!bindings) return null;
    const bridge = new DomBridge(
      {},
      Object.fromEntries(
        bindings.services.map((s) => [
          s.id,
          { element: s.request, label: `Solicita asistencia y cita: ${s.name}` },
        ]),
      ),
      { onIssue: restore },
    );
    return {
      bridge,
      title: 'Catálogo de servicios de asistencia',
      description: 'Agencia Tributaria · Elige el servicio',
      page: 'catalogo',
      pageStyles,
      slots: [],
      ...aeatLayout(
        bindings.title,
        bindings.description.parentElement ?? bindings.description,
        bridge,
        () => <Catalogo bindings={bindings} restore={restore} />,
      ),
      health: () => bindings.carousel.isConnected,
    };
  },
};

/** Sin tildes ni mayúsculas, y «Cl@ve» se encuentra escribiendo «clave». */
const searchable = (value: string) => normalizedLabel(value).replaceAll('@', 'a');
const matches = (text: string, query: string) => {
  const q = searchable(query);
  const t = searchable(text);
  return !q || q.split(' ').every((word) => t.includes(word));
};

function Catalogo({ bindings, restore }: { bindings: CatalogoBindings; restore: () => void }) {
  const bridge = useBridge();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [channel, setChannel] = useState('');
  const searchId = useId();
  const categoryId = useId();
  const channelId = useId();

  const results = useMemo(
    () =>
      bindings.services.filter(
        (s) =>
          matches(`${s.name} ${s.description}`, query) &&
          (!category || s.category === category) &&
          (!channel || s.channels.includes(channel)),
      ),
    [bindings.services, query, category, channel],
  );

  return (
    <Panel
      title="Encuentra tu servicio de asistencia"
      lead={
        <p>
          Busca entre los {bindings.services.length} servicios que publica la Agencia Tributaria. Al
          solicitar uno, la web oficial te pedirá tu NIF y tu nombre.
        </p>
      }
      progress={
        <ProgressSteps steps={STEPS} current="servicio" outOfScopeFrom={OUT_OF_SCOPE_FROM} />
      }
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <SearchField
          id={searchId}
          label="Buscar servicio"
          value={query}
          onChange={setQuery}
          placeholder="Ej.: Cl@ve, IVA, deudas, censo…"
        />
        <div>
          <label htmlFor={categoryId} className="bg-label">
            Categoría
          </label>
          <select
            id={categoryId}
            value={category}
            onChange={(e) => setCategory(e.currentTarget.value)}
            className="bg-field"
          >
            <option value="">Todas</option>
            {bindings.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={channelId} className="bg-label">
            Canal
          </label>
          <select
            id={channelId}
            value={channel}
            onChange={(e) => setChannel(e.currentTarget.value)}
            className="bg-field"
          >
            <option value="">Todos</option>
            {bindings.channels.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="bg-eyebrow" aria-live="polite">
        {results.length} {results.length === 1 ? 'servicio' : 'servicios'}
      </p>
      <ul className="max-h-[560px] space-y-3 overflow-y-auto p-1">
        {results.map((s) => (
          <li key={s.id} className="rounded-control border border-line p-4">
            <p className="bg-eyebrow">{s.category}</p>
            <h3 className="bg-h3 mt-1">{s.name}</h3>
            {s.description && <p className="bg-hint mt-1">{s.description}</p>}
            {s.note && <p className="bg-small mt-1">{s.note}</p>}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <ul className="flex flex-wrap gap-1.5" aria-label="Canales">
                {s.channels.map((c) => (
                  <li
                    key={c}
                    className="rounded-full border border-line bg-surface-muted px-2.5 py-0.5 text-[13px] text-ink-muted"
                  >
                    {c}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="bg-btn bg-btn-secondary"
                aria-label={s.requestLabel}
                onClick={() => {
                  if (!bridge.activate(s.id)) restore();
                }}
              >
                Solicita asistencia y cita
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </li>
        ))}
        {results.length === 0 && (
          <li className="bg-hint">Ningún servicio coincide con la búsqueda.</li>
        )}
      </ul>

      <Callout tone="neutral" title="Oficinas de cada servicio">
        El catálogo oficial sigue debajo, con «¿En qué oficinas?» en cada servicio.{' '}
        <LinkButton onClick={() => scrollToOfficial(bindings.carousel)}>
          Ir al catálogo oficial
        </LinkButton>
      </Callout>
    </Panel>
  );
}
