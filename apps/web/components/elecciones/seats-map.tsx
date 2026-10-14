'use client';

import { useEffect, useRef, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@reforma-digital/design/ui/tabs';
import { seatRadius } from '../../lib/elecciones/seats';
import { Label, Stat } from './report';

export type Seat = {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  color: string;
  label: string;
  delay: number;
};

// Un punto por escaño: primero en su provincia y, al verlo, cada uno vuela a su sitio del hemiciclo.
// Las pestañas de arriba cambian de vista. Al lado, la cifra y los grupos con sus escaños; en móvil, el mapa va antes que los grupos.
export function SeatsMap({
  width,
  height,
  provinces,
  canarias,
  seats,
  hemicycleRadius,
  groups,
}: {
  width: number;
  height: number;
  provinces: { id: string; name: string; d: string }[];
  canarias: string;
  seats: Seat[];
  hemicycleRadius: number;
  groups: { label: string; color: string; seats: number }[];
}) {
  const [hemicycle, setHemicycle] = useState(false);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const element = svg.current;
    if (!element || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.intersectionRatio > 0.6)) return;
        observer.disconnect();
        timer = setTimeout(() => setHemicycle(true), 700);
      },
      { threshold: [0.6] },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const scale = hemicycleRadius / seatRadius;
  return (
    <Tabs
      value={hemicycle ? 'hemiciclo' : 'mapa'}
      onValueChange={(value) => setHemicycle(value === 'hemiciclo')}
      className="gap-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Label>Del mapa al hemiciclo</Label>
        <TabsList aria-label="Vista">
          <TabsTrigger value="mapa" className="px-3">
            Mapa
          </TabsTrigger>
          <TabsTrigger value="hemiciclo" className="px-3">
            Hemiciclo
          </TabsTrigger>
        </TabsList>
      </div>
      <div className="grid items-center gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-12">
        <div className="grid content-start gap-6 max-lg:contents">
          <Stat
            value="350"
            caption={
              hemicycle
                ? 'escaños en el hemiciclo, cada uno en su sitio'
                : 'escaños, repartidos entre 52 circunscripciones'
            }
          />
          <p className="m-0 text-base leading-relaxed text-muted-foreground">
            Cada punto es un diputado de la XV legislatura, con el color de su grupo.
          </p>
          <ul className="m-0 grid list-none gap-2 border-t border-border p-0 pt-6 text-base max-lg:order-last">
            {groups.map((g) => (
              <li
                key={g.label}
                className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-3"
              >
                <i className="block size-2.5 rounded-full" style={{ background: g.color }} />
                <span className="leading-snug">{g.label}</span>
                <span className="font-mono tabular-nums">{g.seats}</span>
              </li>
            ))}
          </ul>
        </div>
        <svg
          ref={svg}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Mapa de España con un punto por escaño, que se reordena en el hemiciclo del Congreso"
          className="block h-auto w-full max-w-3xl justify-self-center"
        >
          <g
            className="fill-muted stroke-background transition-opacity duration-500"
            style={{ opacity: hemicycle ? 0.12 : 1 }}
          >
            {provinces.map((p) => (
              <path key={p.id} d={p.d} strokeWidth={0.8}>
                <title>{p.name}</title>
              </path>
            ))}
            <path d={canarias} fill="none" className="stroke-border" strokeWidth={0.8} />
          </g>
          <g className="stroke-background">
            {seats.map((s, i) => (
              <circle
                key={i}
                cx={s.ax}
                cy={s.ay}
                r={seatRadius}
                fill={s.color}
                strokeWidth={0.8}
                className="transition-transform duration-900 ease-(--ease-brand) motion-reduce:transition-none"
                style={{
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                  transform: hemicycle
                    ? `translate(${s.bx - s.ax}px, ${s.by - s.ay}px) scale(${scale})`
                    : 'none',
                  transitionDelay: `${s.delay}ms`,
                }}
              >
                <title>{s.label}</title>
              </circle>
            ))}
          </g>
        </svg>
      </div>
    </Tabs>
  );
}
