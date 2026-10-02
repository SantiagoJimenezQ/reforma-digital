'use client';
import { useState, useRef } from 'react';

import { LockKeyhole } from 'lucide-react';
import { categorias, servicios } from './data/aeat';
import { pasos, normalize } from './site';

const domain = 'www2.agenciatributaria.gob.es';

// Mismas clases que la extensión (packages/design/tailwind-preset.js): la demo no define estilos propios.
const choice = 'bg-choice [&[hidden]]:!hidden';

export default function DemoTransform({
  compact = false,
  initialView = 'enhanced',
}: {
  compact?: boolean;
  initialView?: 'legacy' | 'enhanced';
}) {
  const [view, setView] = useState<'legacy' | 'enhanced'>(initialView);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState('');
  const [request, setRequest] = useState('');
  const enhanced = useRef<HTMLDivElement>(null);
  const matches = (s: (typeof servicios)[number]) =>
    (!query || normalize(s.name).includes(normalize(query.trim()))) &&
    (!category || s.category === category);
  const count = servicios.filter(matches).length;
  const selectedService = servicios.find((s) => s.id === selected);
  const select = (id: string) => {
    setSelected(id);
    setRequest('');
  };
  return (
    <>
      {compact && (
        <div className="demo-view-switch" role="group" aria-label="Versión de la web">
          <button type="button" aria-pressed={view === 'legacy'} onClick={() => setView('legacy')}>
            Original
          </button>
          <button
            type="button"
            aria-pressed={view === 'enhanced'}
            onClick={() => setView('enhanced')}
          >
            Mejorada
          </button>
        </div>
      )}
      <div className="m-0 flex flex-col gap-4 min-[861px]:flex-row" data-demo>
        <div
          hidden={compact && view !== 'legacy'}
          className="flex min-w-0 flex-1 flex-col gap-3 [&[hidden]]:!hidden"
        >
          <p
            hidden={compact}
            className="text-center font-mono text-sm font-medium uppercase tracking-[0.12em] text-danger-fg"
          >
            Sin Reforma Digital
          </p>
          <div
            className="overflow-hidden rounded-[18px] border border-line bg-surface text-ink"
            data-browser
          >
            <div className="flex items-center gap-3 border-b border-line bg-surface-muted py-2.5 pl-4 pr-3">
              <span className="flex gap-1.5 max-[1100px]:hidden" aria-hidden="true">
                <i className="size-[10px] rounded-full bg-line-strong"></i>
                <i className="size-[10px] rounded-full bg-line-strong"></i>
                <i className="size-[10px] rounded-full bg-line-strong"></i>
              </span>
              <span className="flex h-[32px] min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap rounded-lg border border-line bg-surface px-3 font-mono text-[11px] text-ink-subtle">
                <LockKeyhole size={13} strokeWidth={1.7} aria-hidden="true" />
                <span className="truncate text-ink">{domain}</span>
              </span>
            </div>
            <div className="relative h-[clamp(500px,52vw,620px)] overflow-hidden">
              <div
                className="absolute inset-0 overflow-auto overscroll-contain bg-white px-5 pb-8 pt-5 font-[Arial,sans-serif] text-[#222]"
                data-view="legacy"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-10 w-[90px] shrink-0 bg-[repeating-linear-gradient(-45deg,#dedede_0_6px,#e8e8e8_6px_12px)]"
                    aria-hidden="true"
                  ></span>
                  <span className="ml-1 text-[18px] leading-tight text-[#555]">
                    Agencia Tributaria
                    <small className="block text-[12px] font-bold">Sede electrónica</small>
                  </span>
                  <span
                    className="ml-auto bg-[#666] px-4 py-2.5 text-xs font-bold text-white max-[560px]:hidden"
                    aria-hidden="true"
                  >
                    ÁREA PERSONAL
                  </span>
                </div>
                <div className="mt-3 h-1.5 bg-[#666]" aria-hidden="true"></div>
                <h3 className="mt-6 text-[22px] font-bold leading-tight">
                  Catálogo de servicios de asistencia
                </h3>
                <p className="mt-2 max-w-[640px] text-[15px]">
                  Conoce los diferentes servicios de asistencia que presta la Agencia Tributaria y
                  los diferentes canales por los que puede acceder
                </p>
                <div className="mt-3 flex gap-10 text-[15px] text-[#555]">
                  <span>Índice:</span>
                  <ol className="m-0 list-none p-0 leading-[1.8]">
                    {categorias.slice(0, 5).map((c, i) => (
                      <li key={c} className={i >= 4 ? 'opacity-40' : undefined}>
                        {i + 1}. {c}
                      </li>
                    ))}
                  </ol>
                </div>
                <p
                  className="mb-6 border-b border-[#ddd] pb-2 text-center text-[#666]"
                  aria-hidden="true"
                >
                  ⌄
                </p>
                {categorias.map((c) => (
                  <section key={c}>
                    <h4 className="mb-3 mt-6 text-[21px] font-bold">{c}</h4>
                    {servicios
                      .filter((s) => s.category === c)
                      .map((s) => (
                        <div
                          className="mb-3 border border-[#ddd] px-5 py-4 shadow-[0_1px_3px_rgb(0_0_0/0.15)] transition-[outline-color] data-[picked]:outline data-[picked]:outline-2 data-[picked]:outline-[#777]"
                          key={s.id}
                          data-legacy={s.id}
                          data-picked={selected === s.id ? '' : undefined}
                        >
                          <p className="flex flex-wrap justify-between gap-2 border-b border-[#eee] pb-2 text-[15px]">
                            <span>
                              Servicio: <b>{s.name}</b>
                            </span>
                            <span className="text-[#777]">
                              Canales:{' '}
                              <span className="tracking-[3px]" aria-hidden="true">
                                {s.channels.map(() => '▣').join('')}
                              </span>
                            </span>
                          </p>
                          {s.description && <p className="mt-2 text-sm">{s.description}</p>}
                          <button
                            type="button"
                            className="mx-auto mt-3 block w-full max-w-[500px] bg-[#666] py-2.5 text-sm font-bold text-white"
                            title={`Solicitar asistencia y cita para ${s.name}`}
                            data-legacy-request={s.id}
                            onClick={() => {
                              select(s.id);
                              setQuery('');
                              setCategory('');
                              enhanced.current?.scrollIntoView({
                                behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
                                  .matches
                                  ? 'instant'
                                  : 'smooth',
                                block: 'nearest',
                              });
                            }}
                          >
                            Solicita asistencia y cita
                          </button>
                        </div>
                      ))}
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          hidden={compact && view !== 'enhanced'}
          className="flex min-w-0 flex-1 flex-col gap-3 [&[hidden]]:!hidden"
        >
          <p
            hidden={compact}
            className="text-center font-mono text-sm font-medium uppercase tracking-[0.12em] text-success-fg"
          >
            Con Reforma Digital
          </p>
          <div
            className="overflow-hidden rounded-[18px] border border-line bg-surface text-ink"
            data-browser
          >
            <div className="flex items-center gap-3 border-b border-line bg-surface-muted py-2.5 pl-4 pr-3">
              <span className="flex gap-1.5 max-[1100px]:hidden" aria-hidden="true">
                <i className="size-[10px] rounded-full bg-line-strong"></i>
                <i className="size-[10px] rounded-full bg-line-strong"></i>
                <i className="size-[10px] rounded-full bg-line-strong"></i>
              </span>
              <span className="flex h-[32px] min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap rounded-lg border border-line bg-surface px-3 font-mono text-[11px] text-ink-subtle">
                <LockKeyhole size={13} strokeWidth={1.7} aria-hidden="true" />
                <span className="truncate text-ink">{domain}</span>
              </span>
            </div>
            <div className="relative h-[clamp(500px,52vw,620px)] overflow-hidden">
              <div
                className="absolute inset-0 overflow-auto overscroll-contain bg-canvas px-4 pb-8 pt-4"
                data-view="enhanced"
                ref={enhanced}
              >
                <p className="bg-eyebrow mb-2">Catálogo de servicios de asistencia</p>

                <div className="bg-card bg-text p-4 sm:p-6">
                  <p className="bg-h1 !text-[24px]">Encuentra tu servicio de asistencia</p>
                  <p className="bg-lead mt-2 !text-base">
                    Busca entre los {servicios.length} servicios que publica la Agencia Tributaria.
                    Al solicitar uno, la web oficial te pedirá tu NIF y tu nombre.
                  </p>
                  <p className="bg-eyebrow mt-5">Paso 1 de 5 · {pasos[0]}</p>
                  <ol className="m-0 mb-5 mt-2 grid list-none grid-cols-5 gap-2 p-0 max-[900px]:gap-1">
                    {pasos.map((paso, i) => (
                      <li
                        key={paso}
                        className={`bg-step !items-center ${i === 0 ? 'bg-step-current' : 'bg-step-todo'}`}
                      >
                        <span className="bg-step-num">{i + 1}</span>
                        <span className="sr-only">
                          {paso}
                          {i > 0 && ' (solo en la web oficial)'}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <div className="grid gap-3">
                    <div>
                      <label className="bg-label" htmlFor="demo-search">
                        Buscar servicio
                      </label>
                      <input
                        id="demo-search"
                        className="bg-field bg-field-search"
                        type="search"
                        placeholder="Ej.: clave, renta, embargo…"
                        autoComplete="off"
                        data-search
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="bg-label" htmlFor="demo-category">
                        Categoría
                      </label>
                      <select
                        id="demo-category"
                        className="bg-field"
                        data-category
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="">Todas</option>
                        {categorias.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="bg-eyebrow mb-2 mt-4" aria-live="polite" data-count>
                    {count} {count === 1 ? 'servicio' : 'servicios'}
                  </p>
                  <div
                    className="grid max-h-[340px] gap-2 overflow-auto overscroll-contain rounded-control bg-surface-muted p-2"
                    role="radiogroup"
                    aria-label="Servicios de asistencia"
                    data-choices
                  >
                    {servicios.map((s) => (
                      <label
                        key={s.id}
                        hidden={!matches(s)}
                        className={`${choice} ${selected === s.id ? 'bg-choice-checked' : ''}`}
                        data-name={s.name}
                        data-cat={s.category}
                        data-choice
                      >
                        <input
                          type="radio"
                          name="demo-servicio"
                          value={s.id}
                          checked={selected === s.id}
                          onChange={() => select(s.id)}
                        />
                        <span className="grid gap-1">
                          <span className="bg-eyebrow !text-[11px]">{s.category}</span>
                          <span className="text-[15px] font-semibold leading-snug">{s.name}</span>
                          <span className="flex flex-wrap gap-1.5">
                            {s.channels.map((ch) => (
                              <span
                                key={ch}
                                className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-normal text-ink-muted"
                              >
                                {ch}
                              </span>
                            ))}
                          </span>
                        </span>
                      </label>
                    ))}
                    <p className="text-[15px] text-ink-muted" hidden={count > 0} data-empty>
                      Ningún servicio coincide.
                    </p>
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="bg-btn bg-btn-primary"
                      disabled={!selected}
                      data-continue
                      onClick={() =>
                        setRequest(
                          `Has elegido ${selectedService?.name}. Esta es una demostración; continúa en la sede oficial para solicitar la cita.`,
                        )
                      }
                    >
                      {selectedService
                        ? `Solicitar asistencia y cita: ${selectedService.name}`
                        : 'Elige un servicio para continuar'}
                    </button>
                    {request && (
                      <p role="status" className="mt-3 text-sm">
                        {request}{' '}
                        <a
                          href="https://www2.agenciatributaria.gob.es/wlpl/TOCP-MUTE/ServiciosAsocCat"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Abrir sede oficial
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
