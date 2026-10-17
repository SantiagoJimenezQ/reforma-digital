import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@reforma-digital/design/ui/button';
import { Notice, Response, Thinking } from '@reforma-digital/design/chat';
import { cn } from '@reforma-digital/design/lib/utils';
import { officialLevel } from '@reforma-digital/government/domains';
import type { ItemConversacion, TramiteVista } from '../shared/api';
import { cargarTramite, useEstado } from './estado';
import { host } from './formato';
import { FuentesRespuesta } from './fuentes';
import { Icono } from './icono';
import { Compositor } from './inicio';
import { Pregunta } from './preguntas';
const DE_NAVEGADOR = new Set([
  'abrir',
  'pulsar',
  'escribir',
  'elegir',
  'marcar',
  'tecla',
  'volver',
  'pedir_ayuda',
]);

type Bloque =
  | { tipo: 'item'; item: ItemConversacion }
  | { tipo: 'actividad'; items: Extract<ItemConversacion, { tipo: 'actividad' }>[] };

// Estas acciones ya se ven como su tarjeta: no cuentan entre las acciones del asistente.
const CON_TARJETA = new Set(['preguntar', 'confirmar', 'pedir_ayuda']);

/** Las acciones seguidas del asistente se muestran juntas, como un paso desplegable. */
function agrupar(items: ItemConversacion[]): Bloque[] {
  const bloques: Bloque[] = [];
  for (const item of items) {
    const ultimo = bloques.at(-1);
    if (item.tipo === 'actividad' && CON_TARJETA.has(item.herramienta)) continue;
    if (item.tipo === 'actividad' && ultimo?.tipo === 'actividad') ultimo.items.push(item);
    else if (item.tipo === 'actividad') bloques.push({ tipo: 'actividad', items: [item] });
    else bloques.push({ tipo: 'item', item });
  }
  return bloques;
}

/** Mientras trabaja: qué está haciendo, con el brillo de «pendiente» y el paso concreto debajo. */
const FASES: Record<string, string> = {
  buscar: 'Buscando trámites',
  leer_pagina: 'Leyendo fuentes oficiales',
  leer_texto: 'Leyendo la página',
  mis_datos: 'Revisando tus datos',
  ver: 'Trabajando en la sede',
  esperar: 'Trabajando en la sede',
};
const fase = (herramienta: string) =>
  FASES[herramienta] ?? (DE_NAVEGADOR.has(herramienta) ? 'Trabajando en la sede' : 'Pensando');

function Actividad({
  items,
  enCurso,
}: {
  items: Extract<ItemConversacion, { tipo: 'actividad' }>[];
  enCurso: boolean;
}) {
  const [abierta, setAbierta] = useState(false);
  const errores = items.filter((i) => i.estado === 'error').length;
  // El paso concreto solo si dice algo más que la fase («Leyendo seg-social.es»). Cuando ya ha
  // terminado todo lo que hacía, lo que queda es el modelo pensando el siguiente paso.
  const enMarcha = items.findLast((i) => i.estado === 'inicio');
  if (enCurso)
    return enMarcha ? (
      <Thinking
        label={fase(enMarcha.herramienta)}
        {...(enMarcha.herramienta === 'buscar' ? {} : { stage: enMarcha.resumen })}
      />
    ) : (
      <Thinking label="Pensando" />
    );
  return (
    <div className="my-3">
      <button
        type="button"
        aria-expanded={abierta}
        onClick={() => setAbierta(!abierta)}
        className="flex items-center gap-2 rounded-lg py-1 text-left text-sm text-muted-foreground hover:text-foreground"
      >
        <Icono
          nombre={abierta ? 'atras' : 'siguiente'}
          size={16}
          className={abierta ? '-rotate-90' : ''}
        />
        <span>{`${items.length} ${items.length === 1 ? 'acción' : 'acciones'} del asistente`}</span>
        {errores > 0 && <span>· {errores} sin éxito</span>}
      </button>
      {abierta && (
        <ol className="mt-1 mb-0 ml-2 space-y-1 border-l border-border pl-4 text-sm text-[var(--text-secondary)]">
          {items.map((i) => (
            <li key={i.id} className="flex items-start gap-2">
              <Icono
                nombre={
                  i.estado === 'error' ? 'cerrar' : i.estado === 'fin' ? 'check' : 'siguiente'
                }
                size={16}
                className="mt-0.5 shrink-0"
              />
              <span>
                {i.resumen}
                {i.detalle && (
                  <span className="text-muted-foreground"> · {i.detalle.slice(0, 160)}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Conversacion({
  vista,
  verNavegador,
  abrirFuente,
}: {
  vista: TramiteVista;
  verNavegador: () => void;
  abrirFuente: (url: string) => void;
}) {
  const fin = useRef<HTMLDivElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const trabajando = vista.ejecucion === 'trabajando';
  const bloques = agrupar(vista.conversacion);
  const ultimo = vista.conversacion.at(-1);
  const total = vista.conversacion.reduce(
    (n, i) => n + (i.tipo === 'asistente' ? i.texto.length : 1),
    0,
  );
  // Baja con la respuesta salvo que la persona esté leyendo más arriba.
  useEffect(() => {
    const c = caja.current;
    if (c && c.scrollHeight - c.scrollTop - c.clientHeight < 240)
      fin.current?.scrollIntoView({ block: 'end' });
  }, [total]);
  return (
    <div ref={caja} className="min-h-0 flex-1 overflow-y-auto">
      <div
        role="log"
        aria-label="Conversación"
        aria-busy={trabajando}
        className="mx-auto w-full max-w-[720px] px-8 pt-4 pb-6 [&_.chat-notice]:rounded-[20px] [&_.chat-notice]:px-5"
      >
        {bloques.map((b, n) => {
          if (b.tipo === 'actividad')
            return (
              <Actividad
                key={b.items[0]!.id}
                items={b.items}
                enCurso={trabajando && n === bloques.length - 1}
              />
            );
          const i = b.item;
          if (i.tipo === 'usuario')
            return (
              <div key={i.id} className="my-6">
                <p className="m-0 rounded-[20px] bg-background px-5 py-3.5 text-base leading-relaxed whitespace-pre-wrap">
                  {i.texto}
                </p>
                {i.protegidos > 0 && (
                  <p
                    className="mt-2 mb-0 ml-1 flex items-center gap-1.5 text-sm text-muted-foreground"
                    title="Se enviaron al asistente como marcadores: no ha visto los valores."
                  >
                    <Icono nombre="candado" size={16} />
                    {i.protegidos === 1 ? '1 dato protegido' : `${i.protegidos} datos protegidos`}
                  </p>
                )}
              </div>
            );
          if (i.tipo === 'asistente')
            return (
              <div key={i.id} className="my-4 text-base leading-[1.65]">
                <Response
                  streaming={trabajando && i === ultimo}
                  className="[&_li]:marker:text-muted-foreground [&_ol]:list-decimal [&_ul]:list-disc"
                >
                  {i.texto}
                </Response>
                {i.fuentes && (
                  <FuentesRespuesta
                    fuentes={vista.fuentes.filter((f) => i.fuentes?.includes(f.id))}
                    abrir={abrirFuente}
                  />
                )}
              </div>
            );
          if (i.tipo === 'pregunta')
            return <Pregunta key={i.id} tramite={vista.id} item={i} verNavegador={verNavegador} />;
          if (i.tipo !== 'aviso') return null;
          return (
            <div key={i.id} className="my-4">
              <Notice
                tone={i.tono === 'error' ? 'error' : 'info'}
                icon={<Icono nombre={i.tono === 'error' ? 'aviso' : 'info'} />}
                role={i.tono === 'error' ? 'alert' : 'status'}
                actions={
                  i.continuar && i === ultimo && !trabajando ? (
                    <Button
                      variant="sunset"
                      size="lg"
                      onClick={() => void window.rd.enviar(vista.id, 'Continúa.')}
                    >
                      Continuar
                    </Button>
                  ) : i.archivo ? (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => void window.rd.mostrarArchivo(i.archivo!)}
                    >
                      Mostrar en Finder
                    </Button>
                  ) : undefined
                }
              >
                <p>{i.texto}</p>
              </Notice>
            </div>
          );
        })}
        {trabajando &&
          ultimo?.tipo !== 'actividad' &&
          !(ultimo?.tipo === 'pregunta' && ultimo.estado === 'pendiente') && (
            <Thinking label="Pensando" />
          )}
        <div ref={fin} />
      </div>
    </div>
  );
}

function PanelNavegador({ vista }: { vista: TramiteVista }) {
  const hueco = useRef<HTMLDivElement>(null);
  const nav = vista.navegador;
  const hayVista = Boolean(nav?.url);
  useLayoutEffect(() => {
    const el = hueco.current;
    if (!el || !hayVista) return;
    const colocar = () => {
      const r = el.getBoundingClientRect();
      void window.rd.colocarNavegador(vista.id, {
        x: r.left,
        y: r.top,
        width: r.width,
        height: r.height,
      });
    };
    colocar();
    const ro = new ResizeObserver(colocar);
    ro.observe(el);
    // El hueco también se mueve sin cambiar de tamaño al redimensionar o ampliar la ventana.
    window.addEventListener('resize', colocar);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', colocar);
      void window.rd.colocarNavegador(vista.id, null);
    };
  }, [vista.id, hayVista]);
  const ayuda = vista.conversacion.find(
    (i) => i.tipo === 'pregunta' && i.estado === 'pendiente' && i.pregunta.tipo === 'ayuda',
  );
  const oficial = nav?.url ? Boolean(officialLevel(nav.url)) : false;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Atrás"
          disabled={!nav?.puedeVolver}
          onClick={() => void window.rd.navegar(vista.id, 'atras')}
        >
          <Icono nombre="atras" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Recargar"
          disabled={!hayVista}
          onClick={() => void window.rd.navegar(vista.id, 'recargar')}
        >
          <Icono nombre="recargar" />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm">
          <Icono
            nombre={oficial ? 'escudo' : 'web'}
            size={16}
            className={oficial ? 'shrink-0 text-[#05603A]' : 'shrink-0 text-muted-foreground'}
          />
          <span className="truncate">{nav?.url ? host(nav.url) : 'Sin página'}</span>
          {nav?.url && (
            <span className="ml-auto shrink-0 text-muted-foreground">
              {oficial ? 'Web oficial' : 'No es una web oficial'}
            </span>
          )}
        </div>
      </div>
      {ayuda && ayuda.tipo === 'pregunta' && ayuda.pregunta.tipo === 'ayuda' && (
        <div className="flex items-center gap-3 bg-[var(--warning)] px-4 py-3 text-[15px] text-[var(--warning-foreground)]">
          <Icono nombre="mano" className="shrink-0" />
          <p className="m-0 flex-1">
            <strong className="font-medium">Te toca a ti:</strong>{' '}
            {ayuda.pregunta.ayuda.instrucciones}
          </p>
          <Button
            variant="sunset"
            size="lg"
            onClick={() => void window.rd.responder(vista.id, ayuda.id, true)}
          >
            Ya está
          </Button>
        </div>
      )}
      {hayVista ? (
        <div ref={hueco} className="min-h-0 flex-1 bg-background" />
      ) : (
        <div className="flex flex-1 items-center justify-center p-10 text-center text-[15px] leading-relaxed text-muted-foreground">
          <p className="max-w-[40ch]">
            El navegador se abre cuando el asistente visita una web oficial. Verás aquí todo lo que
            hace y podrás tomar el control cuando quieras.
          </p>
        </div>
      )}
    </div>
  );
}

export function Tramite({ id, alBorrar }: { id: string; alBorrar: () => void }) {
  const { tramites } = useEstado();
  const vista = tramites[id];
  const [verNavegador, setVerNavegador] = useState(false);
  useEffect(() => {
    if (!vista) void cargarTramite(id);
  }, [id, vista]);
  // Mientras el asistente usa el navegador (o te pide que lo uses), se ve lo que pasa.
  const ultimo = vista?.conversacion.at(-1);
  const clave = ultimo ? `${ultimo.id}:${ultimo.tipo === 'actividad' ? ultimo.estado : ''}` : '';
  const pideNavegador = Boolean(
    ultimo &&
    ((ultimo.tipo === 'actividad' &&
      DE_NAVEGADOR.has(ultimo.herramienta) &&
      ultimo.estado === 'inicio') ||
      (ultimo.tipo === 'pregunta' &&
        ultimo.estado === 'pendiente' &&
        ultimo.pregunta.tipo === 'ayuda')),
  );
  useEffect(() => {
    if (pideNavegador) setVerNavegador(true);
  }, [clave, pideNavegador]);
  if (!vista) return null;
  // Las webs oficiales se abren en el navegador del trámite; las demás, en el navegador del Mac.
  const abrirFuente = (url: string) => {
    if (!officialLevel(url)) return void window.rd.abrirEnlace(url);
    setVerNavegador(true);
    void window.rd.abrirEnTramite(vista.id, url);
  };
  const trabajando = vista.ejecucion === 'trabajando';
  // Mientras espera una respuesta tampoco acepta mensajes nuevos, pero se puede detener.
  const ocupado = vista.ejecucion !== 'inactivo';
  return (
    <div className="flex h-full min-h-0">
      <section
        className={cn('flex min-w-0 flex-col', verNavegador ? 'w-[400px] shrink-0' : 'flex-1')}
        aria-label="Conversación"
      >
        <header className="arrastrar flex h-[52px] shrink-0 items-center gap-2 px-6">
          <h1 className="m-0 truncate text-[15px] font-medium">{vista.titulo}</h1>
          {!verNavegador && (
            <Button
              variant="ghost"
              size="lg"
              className="ml-auto hover:bg-foreground/[0.06]"
              onClick={() => setVerNavegador(true)}
            >
              <Icono nombre="web" />
              Navegador
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-lg"
            className={cn('hover:bg-foreground/[0.06]', verNavegador && 'ml-auto')}
            aria-label="Borrar este trámite"
            onClick={() => {
              if (
                confirm(
                  '¿Borrar este trámite? Se borran la conversación y la sesión del navegador. Los documentos descargados se quedan en tu carpeta de Descargas.',
                )
              )
                void window.rd.borrarTramite(vista.id).then(alBorrar);
            }}
          >
            <Icono nombre="papelera" />
          </Button>
        </header>
        <Conversacion
          vista={vista}
          verNavegador={() => setVerNavegador(true)}
          abrirFuente={abrirFuente}
        />
        {/* La conversación se funde con el lienzo justo encima del compositor. */}
        <div className="relative mx-auto w-full max-w-[720px] px-8 pt-2 pb-6 before:pointer-events-none before:absolute before:inset-x-0 before:-top-8 before:h-8 before:bg-linear-to-b before:from-transparent before:to-muted">
          <Compositor
            placeholder={
              trabajando
                ? 'El asistente está trabajando…'
                : ocupado
                  ? 'Responde a la pregunta del asistente'
                  : 'Escribe al asistente'
            }
            ocupado={ocupado}
            alEnviar={(t) => window.rd.enviar(vista.id, t)}
            alDetener={() => void window.rd.detener(vista.id)}
          />
        </div>
      </section>
      {verNavegador && (
        <aside
          aria-label="Navegador del trámite"
          className="flex min-w-0 flex-1 flex-col border-l border-border bg-background"
        >
          <div className="arrastrar flex h-[52px] shrink-0 items-center gap-2 px-4">
            <span className="text-[15px] font-medium">Navegador</span>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              aria-label="Ocultar el navegador"
              onClick={() => setVerNavegador(false)}
            >
              <Icono nombre="cerrar" />
            </Button>
          </div>
          <PanelNavegador vista={vista} />
        </aside>
      )}
    </div>
  );
}
