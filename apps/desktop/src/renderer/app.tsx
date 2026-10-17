import { useEffect, useState } from 'react';
import { Button } from '@reforma-digital/design/ui/button';
import { cn } from '@reforma-digital/design/lib/utils';
import { Ajustes } from './ajustes';
import { MisDatos } from './datos';
import { useEstado } from './estado';
import { hace } from './formato';
import { Icono, Marca } from './icono';
import { Inicio } from './inicio';
import { Tramite } from './tramite';

export type Vista =
  { tipo: 'inicio' } | { tipo: 'tramite'; id: string } | { tipo: 'datos' } | { tipo: 'ajustes' };

/** Una fila de la barra lateral: compacta, con el fondo un poco más oscuro al pasar o al estar activa. */
const fila = (activo: boolean) =>
  cn(
    'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[15px] transition-colors',
    activo ? 'bg-foreground/[0.07] font-medium' : 'hover:bg-foreground/[0.04]',
  );

function Barra({ vista, ir }: { vista: Vista; ir: (v: Vista) => void }) {
  const { app } = useEstado();
  const tramites = app?.tramites ?? [];
  return (
    <nav
      aria-label="Trámites"
      className="flex w-[260px] shrink-0 flex-col border-r border-border bg-foreground/[0.025]"
    >
      <div className="arrastrar h-[52px] shrink-0" />
      <div className="space-y-0.5 px-2.5">
        <button
          type="button"
          className={fila(vista.tipo === 'inicio')}
          onClick={() => ir({ tipo: 'inicio' })}
        >
          <Icono nombre="mas" />
          Nuevo trámite
          <kbd className="ml-auto font-sans text-sm font-normal text-muted-foreground">⌘N</kbd>
        </button>
        <button
          type="button"
          className={fila(vista.tipo === 'datos')}
          onClick={() => ir({ tipo: 'datos' })}
        >
          <Icono nombre="persona" />
          Mis datos
        </button>
      </div>
      <h2 className="mx-5 mt-6 mb-1 text-sm font-normal text-muted-foreground">Trámites</h2>
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-3">
        {tramites.length === 0 && (
          <li className="px-2.5 py-2 text-sm text-muted-foreground">Aún no hay ninguno.</li>
        )}
        {tramites.map((t) => {
          const activo = vista.tipo === 'tramite' && vista.id === t.id;
          const esperando = t.ejecucion === 'esperando';
          const trabajando = t.ejecucion === 'trabajando';
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-current={activo ? 'page' : undefined}
                className={cn(fila(activo), 'gap-2 pl-2')}
                onClick={() => ir({ tipo: 'tramite', id: t.id })}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    esperando && 'bg-brand',
                    trabajando && 'bg-foreground/50 motion-safe:animate-pulse',
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{t.titulo}</span>
                {/* El punto ya dice que trabaja: el texto, solo para lectores de pantalla. */}
                {trabajando ? (
                  <span className="sr-only">Trabajando</span>
                ) : (
                  <span
                    className={cn(
                      'shrink-0 text-sm',
                      esperando
                        ? 'font-medium text-foreground'
                        : 'font-normal text-muted-foreground',
                    )}
                  >
                    {esperando ? 'Te toca' : hace(t.actualizado)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-t border-border px-4">
        <Marca size={18} />
        <span className="font-[family-name:var(--font-brand-logo)] text-[15px] font-bold">
          Reforma Digital
        </span>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Ajustes"
          aria-current={vista.tipo === 'ajustes' ? 'page' : undefined}
          className={cn(
            'ml-auto hover:bg-foreground/[0.06]',
            vista.tipo === 'ajustes' && 'bg-foreground/[0.07]',
          )}
          onClick={() => ir({ tipo: 'ajustes' })}
        >
          <Icono nombre="ajustes" />
        </Button>
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
  return (
    <div className="flex h-full bg-muted">
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
