import type { ReactNode } from 'react';
import { Badge } from '@reforma-digital/design/ui/badge';
import { Button, buttonVariants } from '@reforma-digital/design/ui/button';
import { cn } from '@reforma-digital/design/lib/utils';
import {
  DetailCard,
  DetailGrid,
  SourceDetail,
  SourceSheet,
  Step,
  StepList,
  WhereCard,
} from '@reforma-digital/design/chat';
import type { Fuente, TramiteVista } from '../shared/api';
import { dolares, ETIQUETA_ESTADO, host } from './formato';
import { Icono } from './icono';

const NIVEL: Record<Fuente['nivel'], string> = {
  estatal: 'Administración General del Estado',
  autonomica: 'Comunidad autónoma',
  local: 'Administración local',
  europea: 'Unión Europea',
};
const fecha = (iso: string, conHora = false) =>
  new Date(iso).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  });

export type FuenteAbierta = { id: string; cita?: string } | null;

/** La cita en línea, al final del dato: el organismo, y abre el fragmento oficial. */
function Chip({ children, alAbrir }: { children: ReactNode; alAbrir: () => void }) {
  return (
    <button
      type="button"
      title="Ver el texto oficial"
      onClick={alAbrir}
      className={cn(
        buttonVariants({ variant: 'outline', size: 'xs' }),
        'ml-1 rounded-full align-[1px] font-normal',
      )}
    >
      {children}
      <Icono nombre="enlace" size={12} />
    </button>
  );
}

/** «12 €» o «12,00 euros» dentro del texto del coste, para mostrarlo en grande como en el chat. */
const cifra = (texto: string) =>
  /\d+(?:[.,]\d+)?\s?(?:€|euros)/i.exec(texto)?.[0].replace(/\s?euros/i, ' €');

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="border-t border-border pt-5">
      <h3 className="mt-0 mb-3 font-mono text-xs font-medium tracking-[0.06em] text-muted-foreground uppercase">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

export function PanelTarjeta({
  vista,
  abrirFuente,
  abrirEnTramite,
}: {
  vista: TramiteVista;
  abrirFuente: (f: FuenteAbierta) => void;
  abrirEnTramite: (url: string) => void;
}) {
  const t = vista.tarjeta;
  const etiqueta = (id: string) => {
    const f = vista.fuentes.find((x) => x.id === id);
    return f?.organismo ?? (f ? host(f.url) : id);
  };
  const listas = [
    ['requisitos', 'Requisitos'],
    ['documentos', 'Documentación'],
    ['costes', 'Coste'],
    ['plazos', 'Plazos'],
    ['avisos', 'Lee esto antes'],
  ] as const;
  const vacia = !t.pasos.length && listas.every(([l]) => !t[l].length);
  return (
    <div className="space-y-6 px-6 pt-2 pb-10 [&_.chat-detail]:rounded-[20px] [&_.chat-detail]:px-5 [&_.chat-where]:rounded-[20px] [&_.chat-where]:px-5">
      <header>
        <h2 className="m-0 font-heading text-[28px] leading-[1.15] font-normal tracking-[-0.01em]">
          {t.titulo}
        </h2>
        {t.organismo && (
          <p className="mt-1.5 mb-0 text-[15px] text-[var(--text-secondary)]">{t.organismo}</p>
        )}
        <Badge variant="secondary" className="mt-3">
          {ETIQUETA_ESTADO[t.estado]}
        </Badge>
      </header>

      {vacia && (
        <p className="rounded-2xl bg-muted px-5 py-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          {vista.ejecucion === 'trabajando'
            ? 'El asistente está investigando en webs oficiales. Aquí aparecerán los pasos, requisitos, costes y plazos, cada uno con su fuente.'
            : 'Cuéntale al asistente qué necesitas y aquí tendrás el plan del trámite.'}
        </p>
      )}

      {t.siguiente && (
        <div
          className={
            t.siguiente.quien === 'tu'
              ? 'rounded-2xl bg-[var(--warning)] p-4 text-[var(--warning-foreground)]'
              : 'rounded-2xl bg-muted p-4'
          }
        >
          <p className="m-0 mb-1 text-sm font-medium">
            {t.siguiente.quien === 'tu'
              ? 'Siguiente paso: te toca a ti'
              : 'Siguiente paso del asistente'}
          </p>
          <p className="m-0 text-[15px] leading-relaxed">{t.siguiente.texto}</p>
        </div>
      )}

      {t.cita && (
        <DetailCard label="Tu cita" highlight>
          <p className="m-0 text-lg font-medium">{fecha(t.cita.fecha, true)}</p>
          <p className="mt-1 mb-0">{t.cita.lugar}</p>
          {t.cita.referencia && (
            <p className="mt-1 mb-3 font-mono text-sm">Referencia {t.cita.referencia}</p>
          )}
          <Button
            variant="outline"
            size="lg"
            className="mt-2"
            onClick={() => void window.rd.exportarCita(vista.id)}
          >
            <Icono nombre="calendario" />
            Añadir al Calendario
          </Button>
        </DetailCard>
      )}

      {t.pasos.length > 0 && (
        <Seccion titulo="Pasos">
          <StepList start={1}>
            {t.pasos.map((p, i) => (
              <Step key={`${i}-${p.texto}`} number={i + 1}>
                <p
                  className={
                    p.estado === 'hecho'
                      ? 'm-0 text-[15px] leading-relaxed text-muted-foreground line-through decoration-1'
                      : 'm-0 text-[15px] leading-relaxed'
                  }
                >
                  {p.texto}
                  {p.fuente && (
                    <Chip
                      alAbrir={() =>
                        abrirFuente({ id: p.fuente!, ...(p.cita ? { cita: p.cita } : {}) })
                      }
                    >
                      {etiqueta(p.fuente)}
                    </Chip>
                  )}
                </p>
                <p className="mt-1 mb-0 text-sm text-muted-foreground">
                  {p.quien === 'tu' ? 'Lo haces tú' : 'Lo hace el asistente'}
                  {p.estado === 'hecho' ? ' · Hecho' : p.estado === 'en_curso' ? ' · En curso' : ''}
                </p>
              </Step>
            ))}
          </StepList>
        </Seccion>
      )}

      {t.costes.length > 0 && (
        <DetailGrid>
          {t.costes.map((d, i) => (
            <DetailCard
              key={d.texto + d.fuente}
              label="Coste"
              figure={cifra(d.texto)}
              highlight={i === 0}
            >
              {d.texto}
              <Chip alAbrir={() => abrirFuente({ id: d.fuente, cita: d.cita })}>
                {etiqueta(d.fuente)}
              </Chip>
            </DetailCard>
          ))}
        </DetailGrid>
      )}

      {listas.map(([lista, titulo]) =>
        lista !== 'costes' && t[lista].length ? (
          <Seccion key={lista} titulo={titulo}>
            <ul className="m-0 space-y-3 p-0">
              {t[lista].map((d) => (
                <li key={d.texto + d.fuente} className="list-none text-[15px] leading-relaxed">
                  {d.texto}
                  <Chip alAbrir={() => abrirFuente({ id: d.fuente, cita: d.cita })}>
                    {etiqueta(d.fuente)}
                  </Chip>
                </li>
              ))}
            </ul>
          </Seccion>
        ) : null,
      )}

      {t.enlaces[0] && (
        <WhereCard
          label="Dónde se hace"
          title={t.enlaces[0].titulo}
          description={<span className="font-mono">{host(t.enlaces[0].url)}</span>}
          action={
            <Button variant="sunset" size="lg" onClick={() => abrirEnTramite(t.enlaces[0]!.url)}>
              Abrir la web oficial
            </Button>
          }
        />
      )}

      {t.enlaces.length > 1 && (
        <Seccion titulo="Otras webs oficiales">
          <ul className="m-0 space-y-1 p-0">
            {t.enlaces.slice(1).map((e) => (
              <li key={e.url} className="list-none">
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-xl py-2 text-left text-[15px] hover:underline"
                  onClick={() => abrirEnTramite(e.url)}
                >
                  <Icono nombre="web" className="shrink-0 text-muted-foreground" />
                  <span className="flex-1">{e.titulo}</span>
                  <span className="text-sm text-muted-foreground">{host(e.url)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      {vista.descargas.length > 0 && (
        <Seccion titulo="Documentos descargados">
          <ul className="m-0 space-y-1 p-0">
            {vista.descargas.map((d) => (
              <li key={d.ruta} className="list-none">
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 py-2 text-left text-[15px] hover:underline"
                  onClick={() => void window.rd.mostrarArchivo(d.ruta)}
                >
                  <Icono nombre="carpeta" className="shrink-0 text-muted-foreground" />
                  <span className="flex-1">{d.nombre}</span>
                  <span className="text-sm text-muted-foreground">Mostrar en Finder</span>
                </button>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      {!vacia && (
        <p className="flex items-start gap-2 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
          <Icono nombre="escudo" size={16} className="mt-0.5 shrink-0" />
          Cada requisito, documento, coste y plazo cita literalmente una web oficial, y una segunda
          comprobación confirma que la cita lo respalda.
        </p>
      )}
      <p className="m-0 text-sm text-muted-foreground">
        Coste de este trámite:{' '}
        {vista.uso.costeDesconocido ? 'no disponible' : dolares(vista.uso.costeUsd)} ·{' '}
        {vista.uso.pasos} pasos del asistente
      </p>
    </div>
  );
}

export function HojaFuente({
  vista,
  abierta,
  cerrar,
  abrirEnTramite,
}: {
  vista: TramiteVista;
  abierta: FuenteAbierta;
  cerrar: () => void;
  abrirEnTramite: (url: string) => void;
}) {
  const f = abierta ? vista.fuentes.find((x) => x.id === abierta.id) : undefined;
  return (
    <SourceSheet
      open={Boolean(f)}
      view={f?.id ?? 'list'}
      title="Fuente oficial"
      onClose={cerrar}
      close={
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Cerrar"
          className="ml-auto"
          onClick={cerrar}
        >
          <Icono nombre="cerrar" />
        </Button>
      }
    >
      {f && (
        <SourceDetail
          eyebrow={`Fuente ${f.id} · ${NIVEL[f.nivel]}`}
          organization={f.organismo ?? host(f.url)}
          title={f.titulo}
          excerpt={<p className="m-0 whitespace-pre-wrap">{abierta?.cita ?? f.texto}</p>}
          meta={[
            { label: 'Web', value: host(f.url) },
            { label: 'Consultada', value: fecha(f.consultada) },
            {
              label: 'Texto',
              value: f.origen === 'pagina' ? 'Página leída entera' : 'Extracto del buscador',
            },
          ]}
          action={
            <div className="grid gap-2">
              <Button
                variant="sunset"
                size="lg"
                onClick={() => {
                  abrirEnTramite(f.url);
                  cerrar();
                }}
              >
                Abrir en el navegador del trámite
              </Button>
              <Button variant="ghost" size="lg" onClick={() => void window.rd.abrirEnlace(f.url)}>
                Abrir en Safari
              </Button>
            </div>
          }
        />
      )}
    </SourceSheet>
  );
}
