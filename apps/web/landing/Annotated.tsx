import { LockKeyhole } from 'lucide-react';
import Image from 'next/image';
import { Fragment } from 'react';
import shot from './assets/screens/original-2-catalogo.png';
import { categorias, servicios } from './data/aeat';

// Coordenadas sobre la captura de 1280 × 900 px.
const W = 1280;
const H = 900;
const marks = [
  {
    n: 1,
    box: [98, 140, 596, 184],
    at: [612, 162],
    short: `Sin buscador: ${servicios.length} servicios seguidos`,
    text: `No hay buscador. Son ${servicios.length} servicios, uno debajo de otro.`,
  },
  {
    n: 2,
    box: [110, 244, 520, 404],
    at: [536, 262],
    short: `El índice enseña 5 de ${categorias.length} categorías`,
    text: `El índice enseña 5 de las ${categorias.length} categorías. El resto queda tras una flecha.`,
  },
  {
    n: 3,
    box: [786, 494, 884, 528],
    at: [900, 511],
    short: 'Canales: iconos sin texto',
    text: 'Los canales son iconos sin texto. La leyenda está en otra columna.',
  },
  {
    n: 4,
    box: [248, 604, 756, 652],
    at: [772, 628],
    short: `El mismo botón, ${servicios.length} veces`,
    text: `El mismo botón, «Solicita asistencia y cita», se repite ${servicios.length} veces.`,
  },
];
const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(2)}%`;

export default function Annotated() {
  return (
    <>
      <div className="rounded-[28px] bg-[#f4f4f5] p-2.5">
        <div className="flex items-center gap-3 px-1 pb-3 pt-1">
          <span className="flex gap-1.5 max-[600px]:hidden" aria-hidden="true">
            <i className="size-[10px] rounded-full bg-line-strong"></i>
            <i className="size-[10px] rounded-full bg-line-strong"></i>
            <i className="size-[10px] rounded-full bg-line-strong"></i>
          </span>
          <span className="flex h-[32px] min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap rounded-lg border border-line bg-surface px-3 font-mono text-[11px] text-ink-subtle">
            <LockKeyhole size={13} strokeWidth={1.7} aria-hidden="true" />
            <span className="text-ink">www2.agenciatributaria.gob.es</span>
            <span className="truncate">/wlpl/TOCP-MUTE/ServiciosAsocCat</span>
          </span>
        </div>
        <div className="relative overflow-hidden rounded-[18px] bg-white">
          <Image
            className="block h-auto w-full"
            src={shot}
            alt="Captura del catálogo de servicios de asistencia de la Agencia Tributaria, sin Reforma Digital."

            sizes="(max-width: 760px) 100vw, 720px"
          />
          {marks.map((m) => (
            <Fragment key={m.n}>
              <span
                className="absolute rounded-md border-2 border-brand-900 bg-brand-900/10"
                aria-hidden="true"
                style={{
                  left: pct(m.box[0]!, W),
                  top: pct(m.box[1]!, H),
                  width: pct(m.box[2]! - m.box[0]!, W),
                  height: pct(m.box[3]! - m.box[1]!, H),
                }}
              />
              <span
                className="absolute z-[2] flex -translate-x-[13px] -translate-y-1/2 items-center gap-2 rounded-full bg-brand-900 p-[3px] shadow-[0_0_0_2px_#fff,0_4px_14px_rgb(0_0_0/0.25)] sm:pr-3"
                style={{ left: pct(m.at[0]!, W), top: pct(m.at[1]!, H) }}
              >
                <span
                  className="grid size-5 shrink-0 place-items-center rounded-full bg-white font-mono text-[11px] font-semibold text-brand-900"
                  aria-hidden="true"
                >
                  {m.n}
                </span>
                <span className="whitespace-nowrap text-[11.5px] font-semibold leading-none text-white max-sm:hidden">
                  {m.short}
                </span>
              </span>
            </Fragment>
          ))}
        </div>
        <ol className="m-0 mt-3 grid list-none gap-2 p-0 sm:hidden">
          {marks.map((m) => (
            <li
              key={m.n}
              className="flex items-start gap-2.5 rounded-2xl bg-white p-3 text-[13px] leading-snug text-ink-muted"
            >
              <span
                className="grid size-[20px] shrink-0 place-items-center rounded-full bg-brand-900 font-mono text-[10px] text-white"
                aria-hidden="true"
              >
                {m.n}
              </span>
              {m.text}
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
