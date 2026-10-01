'use client';
import { useEffect, useState } from 'react';

import { ArrowRight, Search } from 'lucide-react';
import { servicios } from './data/aeat';
import { normalize } from './site';

// Búsquedas reales sobre el catálogo oficial: los resultados salen de los datos, no están escritos a mano.
const words = ['clave', 'renta', 'embargo', 'nif'];
const queries = words.map((q) => {
  const found = servicios.filter((s) => normalize(s.name).includes(q));
  return { q, total: found.length, shown: found.slice(0, 3) };
});
const legacyCards = servicios.slice(0, 3);

export default function HeroFigure() {
  const [active, setActive] = useState(0);
  const [typed, setTyped] = useState(words[0]!);
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setTimeout>;
    let index = 0;
    const cycle = () => {
      index = (index + 1) % words.length;
      const word = words[index]!;
      setActive(index);
      setTyping(true);
      setTyped('');
      let n = 0;
      const type = () => {
        setTyped(word.slice(0, ++n));
        if (n < word.length) timer = setTimeout(type, 90);
        else {
          setTyping(false);
          timer = setTimeout(cycle, 2400);
        }
      };
      timer = setTimeout(type, 250);
    };
    const update = () => {
      clearTimeout(timer);
      if (!motion.matches) timer = setTimeout(cycle, 2400);
      else {
        setActive(0);
        setTyped(words[0]!);
        setTyping(false);
      }
    };
    update();
    motion.addEventListener('change', update);
    return () => {
      clearTimeout(timer);
      motion.removeEventListener('change', update);
    };
  }, []);
  return (
    <>
      <figure
        className="m-0"
        aria-label={`El catálogo de servicios de asistencia de la Agencia Tributaria, con ${servicios.length} servicios uno debajo de otro, y la misma página con un buscador.`}
        data-hf
        data-words={words.join(',')}
      >
        <div className="mx-auto grid max-w-[880px] grid-cols-1 items-stretch gap-3 sm:grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)] sm:gap-0">
          <div className="grid h-full justify-items-center motion-safe:animate-rise">
            <div
              className="h-full w-full max-w-[360px] select-none overflow-hidden rounded-[10px] border border-[#ddd] bg-white p-3 font-[Arial,sans-serif] text-[#222] grayscale"
              aria-hidden="true"
            >
              <div className="flex items-center gap-[5px]">
                <span className="h-5 w-10 bg-[repeating-linear-gradient(-45deg,#d9d9d9_0_3px,#e6e6e6_3px_6px)]"></span>
                <b className="ml-1 text-[11px] font-normal text-[#666]">Agencia Tributaria</b>
                <span className="ml-auto bg-[#555] px-2 py-1 text-[7px] font-bold text-white">
                  ÁREA PERSONAL
                </span>
              </div>
              <div className="mt-2 h-[3px] bg-[#555]"></div>
              <p className="mt-3 text-[13px] font-bold">Catálogo de servicios de asistencia</p>
              <div className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 text-[7.5px] leading-[1.6] text-[#777]">
                <span>Índice:</span>
                <span>
                  1. Identificación electrónica
                  <br />
                  2. Trámites destacados
                  <br />
                  3. Pagar, aplazar y consultar deudas
                  <br />
                  <span className="opacity-40">4. Registro y notificaciones</span>
                </span>
              </div>
              <div className="mt-2 grid gap-2">
                {legacyCards.map((s) => (
                  <div
                    key={s.id}
                    className="border border-[#ddd] px-2 py-1.5 shadow-[0_1px_2px_rgb(0_0_0/0.12)]"
                  >
                    <p className="flex justify-between gap-2 border-b border-[#eee] pb-1 text-[8px]">
                      <span className="truncate">
                        Servicio: <b>{s.name}</b>
                      </span>
                      <span className="shrink-0 tracking-[2px] text-[#888]">▣▣▣</span>
                    </p>
                    <span className="mx-auto mt-1.5 block w-3/4 bg-[#555] py-1 text-center text-[7.5px] font-bold text-white">
                      Solicita asistencia y cita
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-center text-[8px] text-[#999]">
                … y {servicios.length - legacyCards.length} servicios más, uno debajo de otro
              </p>
            </div>
          </div>

          <div className="grid place-items-center">
            <span
              className="grid size-10 place-items-center rounded-full bg-brand-900 text-white max-sm:rotate-90 motion-safe:animate-rise motion-safe:[animation-delay:220ms]"
              aria-hidden="true"
            >
              <ArrowRight size={18} strokeWidth={1.7} aria-hidden="true" />
            </span>
          </div>

          <div className="grid h-full justify-items-center motion-safe:animate-rise motion-safe:[animation-delay:380ms]">
            <div
              className="grid h-full w-full max-w-[360px] content-start gap-[9px] overflow-hidden rounded-[10px] border border-line bg-surface p-4 text-ink shadow-[0_12px_30px_-18px_rgb(21_44_92/0.35)] select-none"
              aria-hidden="true"
            >
              <span className="flex items-center gap-1.5 rounded-md border border-brand-600 px-2.5 py-[7px] text-[10px] text-ink shadow-[0_0_0_2px_rgb(var(--bg-brand-200))]">
                <Search
                  size={11}
                  strokeWidth={1.8}
                  className="text-ink-subtle"
                  aria-hidden="true"
                />
                <span data-query>{typed}</span>
                <span className="h-3 w-px animate-pulse bg-ink"></span>
              </span>
              <div>
                {queries.map((r, i) => (
                  <div
                    key={r.q}
                    className="grid gap-1.5"
                    data-result
                    hidden={i !== active || typing}
                  >
                    <p className="text-[8.5px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">
                      {r.total} {r.total === 1 ? 'servicio' : 'servicios'}
                    </p>
                    {r.shown.map((s) => (
                      <span
                        key={s.id}
                        className="grid gap-0.5 rounded-xl border border-line bg-white px-3 py-2"
                      >
                        <span className="truncate text-[7.5px] font-semibold uppercase tracking-[0.05em] text-ink-subtle">
                          {s.category}
                        </span>
                        <span className="flex items-center justify-between gap-2 text-[10.5px] font-semibold">
                          <span className="truncate">{s.name}</span>
                          <span className="shrink-0 rounded-[5px] border border-line-control px-1.5 py-0.5 text-[8px] font-semibold">
                            Solicitar →
                          </span>
                        </span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </figure>
    </>
  );
}
