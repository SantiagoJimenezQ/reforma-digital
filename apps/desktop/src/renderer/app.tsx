import { useEffect, useState } from 'react';
import { buttonVariants } from '@reforma-digital/design/ui/button';
import { cn } from '@reforma-digital/design/lib/utils';
import { Ajustes, Bienvenida } from './ajustes';
import { MisDatos } from './datos';
import { useEstado } from './estado';
import { dolares, ETIQUETA_ESTADO } from './formato';
import { Icono, Marca } from './icono';
import { Inicio } from './inicio';
import { Tramite } from './tramite';

export type Vista =
  { tipo: 'inicio' } | { tipo: 'tramite'; id: string } | { tipo: 'datos' } | { tipo: 'ajustes' };

function Barra({ vista, ir }: { vista: Vista; ir: (v: Vista) => void }) {
  const { app } = useEstado();
  const tramites = app?.tramites ?? [];
  const total = tramites.reduce((a, t) => a + t.costeUsd, 0);
  const item = (activo: boolean) =>
    cn(
      'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[15px] transition-colors',
      activo ? 'bg-background shadow-[var(--shadow-soft)] font-medium' : 'hover:bg-background/70',
    );
  return (
    <nav
      aria-label="Trámites"
      className="flex w-[264px] shrink-0 flex-col border-r border-border bg-muted/60"
    >
      <div className="arrastrar flex h-[52px] items-center justify-end px-4" />
      <div className="flex items-center gap-2.5 px-5 pb-4">
        <Marca size={22} />
        <span className="font-[family-name:var(--font-brand-logo)] text-[15px] leading-[1.05] font-bold">
          Reforma
          <br />
          Digital
        </span>
      </div>
      <div className="px-3 pb-3">
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'lg' }),
            'w-full justify-start gap-2 rounded-xl',
          )}
          onClick={() => ir({ tipo: 'inicio' })}
        >
          <Icono nombre="mas" />
          Nuevo trámite
          <kbd className="ml-auto font-mono text-xs text-muted-foreground">⌘N</kbd>
        </button>
      </div>
      <p className="px-6 pt-2 pb-1.5 font-mono text-xs tracking-[0.06em] text-muted-foreground uppercase">
        Tus trámites
      </p>
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        {tramites.length === 0 && (
          <li className="px-3 py-2 text-sm text-muted-foreground">Aún no hay ninguno.</li>
        )}
        {tramites.map((t) => {
          const activo = vista.tipo === 'tramite' && vista.id === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                className={cn(item(activo), 'flex-col items-start gap-0.5 py-2.5')}
                onClick={() => ir({ tipo: 'tramite', id: t.id })}
              >
                <span className="line-clamp-2 leading-snug [overflow-wrap:anywhere]">
                  {t.titulo}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  {t.ejecucion === 'esperando' ? (
                    <>
                      <span className="size-2 rounded-full bg-brand" aria-hidden="true" />
                      <span className="font-medium text-foreground">Te toca a ti</span>
                    </>
                  ) : t.ejecucion === 'trabajando' ? (
                    <>
                      <span
                        className="size-2 rounded-full bg-foreground/50 motion-safe:animate-pulse"
                        aria-hidden="true"
                      />
                      Trabajando…
                    </>
                  ) : (
                    ETIQUETA_ESTADO[t.estado]
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="space-y-0.5 border-t border-border px-3 py-3">
        <button
          type="button"
          className={item(vista.tipo === 'datos')}
          onClick={() => ir({ tipo: 'datos' })}
        >
          <Icono nombre="persona" />
          Mis datos
        </button>
        <button
          type="button"
          className={item(vista.tipo === 'ajustes')}
          onClick={() => ir({ tipo: 'ajustes' })}
        >
          <Icono nombre="ajustes" />
          Ajustes
        </button>
        <p className="px-3 pt-2 text-sm text-muted-foreground">Gasto en IA: {dolares(total)}</p>
      </div>
    </nav>
  );
}

export function App() {
  const { app } = useEstado();
  const [vista, ir] = useState<Vista>({ tipo: 'inicio' });
  useEffect(
    () =>
      window.rd.on((e) => {
        if (e.tipo === 'menu') ir({ tipo: e.vista });
      }),
    [],
  );
  if (!app) return null;
  if (!app.configurado) return <Bienvenida />;
  return (
    <div className="flex h-full">
      <Barra vista={vista} ir={ir} />
      <main className="flex min-w-0 flex-1 flex-col">
        {vista.tipo === 'inicio' && <Inicio abrir={(id) => ir({ tipo: 'tramite', id })} />}
        {vista.tipo === 'tramite' && (
          <Tramite key={vista.id} id={vista.id} alBorrar={() => ir({ tipo: 'inicio' })} />
        )}
        {vista.tipo === 'datos' && <MisDatos />}
        {vista.tipo === 'ajustes' && <Ajustes />}
      </main>
    </div>
  );
}
