import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from '@reforma-digital/design/ui/button';
import { Input } from '@reforma-digital/design/ui/input';
import { Textarea } from '@reforma-digital/design/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@reforma-digital/design/ui/radio-group';
import type { Ayuda, ItemConversacion } from '../shared/api';
import { useEstado } from './estado';
import { Icono, type NombreIcono } from './icono';

type ItemPregunta = Extract<ItemConversacion, { tipo: 'pregunta' }>;
export const TIPO_INPUT: Partial<Record<string, string>> = {
  fecha: 'date',
  email: 'email',
  telefono: 'tel',
  numero: 'number',
};

/** Una pregunta pendiente recibe el foco al aparecer, salvo que la persona tenga algo escrito. */
function Tarjeta({
  icono,
  eyebrow,
  titulo,
  children,
}: {
  icono: NombreIcono;
  eyebrow: string;
  titulo: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const idTitulo = useId();
  useEffect(() => {
    const activo = document.activeElement;
    if (
      !(activo instanceof HTMLInputElement || activo instanceof HTMLTextAreaElement) ||
      !activo.value
    )
      ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby={idTitulo}
      className="my-6 rounded-[20px] bg-background p-5 shadow-[var(--shadow-soft)] outline-none [animation:chat-enter_360ms_var(--ease-brand)_both] focus-visible:ring-2 focus-visible:ring-ring"
    >
      <p className="mb-1.5 flex items-center gap-2 text-sm font-medium text-brand">
        <Icono nombre={icono} />
        {eyebrow}
      </p>
      <h3 id={idTitulo} className="m-0 mb-3 text-lg leading-snug font-medium">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

/**
 * Envía la respuesta. La tarjeta vuelve a estar disponible si no llega al proceso principal o si
 * sigue pendiente (Touch ID cancelado).
 */
function useResponder(tramite: string, item: ItemPregunta) {
  const [enviando, setEnviando] = useState(false);
  const responder = (r: Record<string, string> | boolean | null) => {
    setEnviando(true);
    window.rd.responder(tramite, item.id, r).then(
      (hecho) => setEnviando(!hecho),
      () => setEnviando(false),
    );
  };
  return { enviando, responder };
}

/** Sustituye los marcadores por la pista enmascarada de Mis datos: «DNI {{documento_numero}}» → «DNI •••• 78Z». */
function useConMarcadores() {
  const { app } = useEstado();
  const vista = new Map((app?.perfil ?? []).map((d) => [d.clave, d.vista]));
  return (t: string) =>
    t.replace(/\{\{([a-z0-9_.]+)(?::[a-z/]+)?\}\}/gi, (_m, clave: string) => {
      const v = vista.get(clave);
      return v ? `«${v}»` : `«${app?.campos.find((c) => c.clave === clave)?.etiqueta ?? clave}»`;
    });
}

function Formulario({ tramite, item }: { tramite: string; item: ItemPregunta }) {
  const base = useId();
  const f = item.pregunta.tipo === 'formulario' ? item.pregunta.formulario : null;
  const [valores, setValores] = useState<Record<string, string>>({});
  const { enviando, responder } = useResponder(tramite, item);
  if (!f) return null;
  const faltan = f.campos.filter((c) => c.obligatorio !== false && !valores[c.clave]?.trim());
  const fijar = (clave: string, v: string) => setValores((x) => ({ ...x, [clave]: v }));
  return (
    <Tarjeta icono="documento" eyebrow="El asistente necesita unos datos" titulo={f.titulo}>
      {f.explicacion && (
        <p className="mt-0 mb-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          {f.explicacion}
        </p>
      )}
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!faltan.length) responder(valores);
        }}
      >
        {f.campos.map((c) => {
          const idCampo = `${base}-${c.clave}`;
          const ayuda = c.privado
            ? 'Se guarda cifrado en tu Mac. El asistente no verá el valor.'
            : c.ayuda;
          return (
            <div key={c.clave}>
              <label
                htmlFor={idCampo}
                className="mb-1.5 flex items-center gap-1.5 text-[15px] font-medium"
              >
                {c.privado && (
                  <Icono nombre="candado" size={16} className="text-muted-foreground" />
                )}
                {c.etiqueta}
                {c.obligatorio === false && (
                  <span className="font-normal text-muted-foreground">(opcional)</span>
                )}
              </label>
              {c.tipo === 'si_no' || (c.tipo === 'opcion' && c.opciones?.length) ? (
                <RadioGroup
                  id={idCampo}
                  aria-label={c.etiqueta}
                  value={valores[c.clave] ?? ''}
                  onValueChange={(v) => fijar(c.clave, String(v))}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  {(c.tipo === 'si_no' ? ['Sí', 'No'] : (c.opciones ?? [])).map((o) => (
                    <label
                      key={o}
                      className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-border px-3 text-[15px] has-data-checked:border-foreground has-data-checked:font-medium"
                    >
                      <RadioGroupItem value={o} />
                      {o}
                    </label>
                  ))}
                </RadioGroup>
              ) : c.tipo === 'texto_largo' ? (
                <Textarea
                  id={idCampo}
                  maxLength={2000}
                  value={valores[c.clave] ?? ''}
                  onChange={(e) => fijar(c.clave, e.target.value)}
                />
              ) : (
                <Input
                  id={idCampo}
                  className="h-11 text-base"
                  type={TIPO_INPUT[c.tipo] ?? 'text'}
                  autoComplete="off"
                  maxLength={2000}
                  value={valores[c.clave] ?? ''}
                  onChange={(e) => fijar(c.clave, e.target.value)}
                />
              )}
              {ayuda && <p className="mt-1.5 mb-0 text-sm text-muted-foreground">{ayuda}</p>}
            </div>
          );
        })}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="submit" variant="sunset" size="lg" disabled={enviando || faltan.length > 0}>
            Enviar respuestas
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={enviando}
            onClick={() => responder(null)}
          >
            Ahora no
          </Button>
          {faltan.length > 0 && (
            <span className="text-sm text-muted-foreground">
              Faltan {faltan.length} por completar.
            </span>
          )}
        </div>
      </form>
    </Tarjeta>
  );
}

function Confirmacion({ tramite, item }: { tramite: string; item: ItemPregunta }) {
  const { app } = useEstado();
  const conMarcadores = useConMarcadores();
  const { enviando, responder } = useResponder(tramite, item);
  if (item.pregunta.tipo !== 'confirmacion') return null;
  const c = item.pregunta.confirmacion;
  const web = c.tipo === 'abrir_web';
  const huella = !web && app?.touchId && app.ajustes.touchIdEnConfirmaciones;
  return (
    <Tarjeta
      icono={web ? 'web' : 'huella'}
      eyebrow={web ? 'Abrir una web que no es oficial' : 'Necesito tu permiso'}
      titulo={c.accion}
    >
      {c.previas?.length ? (
        <p className="mt-0 mb-3 flex gap-2 rounded-xl bg-[var(--warning)] px-3 py-2.5 text-sm text-[var(--warning-foreground)]">
          <Icono nombre="aviso" />
          <span>
            En este trámite ya se hizo: {c.previas.join('; ')}. Comprueba que no lo estás
            repitiendo.
          </span>
        </p>
      ) : null}
      {c.detalles.length > 0 && (
        <ul className="mt-0 mb-4 space-y-1.5 pl-5 text-[15px] leading-relaxed">
          {c.detalles.map((d) => (
            <li key={d}>{conMarcadores(d)}</li>
          ))}
        </ul>
      )}
      {c.sitio && <p className="mt-0 mb-4 text-sm text-muted-foreground">En {c.sitio}</p>}
      <div className="flex flex-wrap gap-3">
        <Button variant="sunset" size="lg" disabled={enviando} onClick={() => responder(true)}>
          {huella && <Icono nombre="huella" />}
          {web ? 'Abrir' : 'Aprobar'}
        </Button>
        <Button variant="outline" size="lg" disabled={enviando} onClick={() => responder(false)}>
          No
        </Button>
      </div>
    </Tarjeta>
  );
}

const MOTIVOS: Record<Ayuda['motivo'], { icono: NombreIcono; eyebrow: string }> = {
  iniciar_sesion: { icono: 'candado', eyebrow: 'Inicia sesión tú' },
  captcha: { icono: 'mano', eyebrow: 'Resuelve la comprobación' },
  certificado: { icono: 'huella', eyebrow: 'Elige tu certificado' },
  firma: { icono: 'huella', eyebrow: 'Firma tú con AutoFirma' },
  pago: { icono: 'mano', eyebrow: 'El pago lo haces tú' },
  adjuntar: { icono: 'documento', eyebrow: 'Adjunta el archivo' },
  otro: { icono: 'mano', eyebrow: 'Te toca a ti' },
};

function Ayuda({
  tramite,
  item,
  verNavegador,
}: {
  tramite: string;
  item: ItemPregunta;
  verNavegador: () => void;
}) {
  const { enviando, responder } = useResponder(tramite, item);
  if (item.pregunta.tipo !== 'ayuda') return null;
  const a = item.pregunta.ayuda;
  const m = MOTIVOS[a.motivo];
  return (
    <Tarjeta icono={m.icono} eyebrow={m.eyebrow} titulo={a.instrucciones}>
      <p className="mt-0 mb-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">
        Hazlo en el navegador de la derecha, en la web oficial. El asistente espera y no ve lo que
        escribes en las contraseñas.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="sunset" size="lg" disabled={enviando} onClick={() => responder(true)}>
          Ya está
        </Button>
        <Button variant="outline" size="lg" onClick={verNavegador}>
          Ver el navegador
        </Button>
        <Button variant="ghost" size="lg" disabled={enviando} onClick={() => responder(false)}>
          No he podido
        </Button>
      </div>
    </Tarjeta>
  );
}

export function Pregunta({
  tramite,
  item,
  verNavegador,
}: {
  tramite: string;
  item: ItemPregunta;
  verNavegador: () => void;
}) {
  if (item.estado !== 'pendiente') {
    const titulo =
      item.pregunta.tipo === 'formulario'
        ? item.pregunta.formulario.titulo
        : item.pregunta.tipo === 'confirmacion'
          ? item.pregunta.confirmacion.accion
          : item.pregunta.ayuda.instrucciones;
    return (
      <p className="my-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Icono
          nombre={
            item.resultado === 'No aprobado' || item.estado === 'cancelada' ? 'cerrar' : 'check'
          }
          size={16}
        />
        <span>
          {titulo} · <span className="font-medium text-foreground">{item.resultado}</span>
        </span>
      </p>
    );
  }
  if (item.pregunta.tipo === 'formulario') return <Formulario tramite={tramite} item={item} />;
  if (item.pregunta.tipo === 'confirmacion') return <Confirmacion tramite={tramite} item={item} />;
  return <Ayuda tramite={tramite} item={item} verNavegador={verNavegador} />;
}
