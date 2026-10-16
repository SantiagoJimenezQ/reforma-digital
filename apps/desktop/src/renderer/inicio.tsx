import { useRef, useState, type KeyboardEvent } from 'react';
import { Button } from '@reforma-digital/design/ui/button';
import { useEstado } from './estado';
import { Icono, type NombreIcono } from './icono';

const SUGERENCIAS = [
  'Quiero renovar mi DNI',
  'Necesito empadronarme en mi municipio',
  'Quiero descargar mi vida laboral',
  'Quiero darme de alta como autónomo',
  'Necesito pedir el paro',
];

/** El campo para escribir, el mismo en el inicio y en cada trámite. */
export function Compositor({
  placeholder,
  ocupado,
  alEnviar,
  alDetener,
  autoFocus = false,
}: {
  placeholder: string;
  ocupado: boolean;
  alEnviar: (texto: string) => Promise<void> | void;
  alDetener?: () => void;
  autoFocus?: boolean;
}) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const enviar = async () => {
    const t = texto.trim();
    if (!t || ocupado || enviando) return;
    setEnviando(true);
    try {
      await alEnviar(t);
      setTexto('');
    } finally {
      setEnviando(false);
      ref.current?.focus();
    }
  };
  const tecla = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void enviar();
    }
  };
  return (
    <div className="flex items-end gap-2 rounded-[28px] bg-background p-2.5 pl-5 shadow-[var(--shadow-soft)] focus-within:ring-3 focus-within:ring-ring/40">
      <label className="sr-only" htmlFor="compositor">
        Mensaje para el asistente
      </label>
      <textarea
        id="compositor"
        ref={ref}
        autoFocus={autoFocus}
        rows={1}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={tecla}
        placeholder={placeholder}
        maxLength={4000}
        className="field-sizing-content max-h-48 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-base leading-6 outline-none placeholder:text-muted-foreground"
      />
      {ocupado && alDetener ? (
        <Button
          variant="outline"
          size="icon-lg"
          className="rounded-full"
          aria-label="Detener al asistente"
          onClick={alDetener}
        >
          <Icono nombre="detener" />
        </Button>
      ) : (
        <Button
          variant="sunset"
          size="icon-lg"
          className="rounded-full"
          aria-label="Enviar"
          disabled={!texto.trim() || ocupado || enviando}
          onClick={() => void enviar()}
        >
          <Icono nombre="enviar" />
        </Button>
      )}
    </div>
  );
}

const PROMESAS: { icono: NombreIcono; titulo: string; texto: string }[] = [
  {
    icono: 'escudo',
    titulo: 'Fuentes oficiales',
    texto: 'Cada requisito, coste y plazo cita una web de la Administración.',
  },
  {
    icono: 'huella',
    titulo: 'Tú das el permiso',
    texto: 'Nada se envía, reserva, paga ni firma sin tu aprobación.',
  },
  {
    icono: 'candado',
    titulo: 'Tus datos, en tu Mac',
    texto: 'Se guardan cifrados. La IA no ve tu nombre, tu DNI ni tu dirección.',
  },
];

export function Inicio({ abrir }: { abrir: (id: string) => void }) {
  const { app } = useEstado();
  const crear = async (texto: string) => abrir(await window.rd.crearTramite(texto));
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* El atardecer de Sol, solo como luz de fondo bajo el contenido. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-[radial-gradient(70%_100%_at_50%_100%,color-mix(in_oklab,var(--brand-yellow)_22%,transparent),transparent)]"
      />
      <div className="arrastrar h-[52px] shrink-0" />
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-8 pb-16">
        <div className="w-full max-w-[720px]">
          <div className="text-center">
            <h1 className="m-0 font-heading text-[52px] leading-[1.08] font-normal tracking-[-0.02em]">
              ¿Qué trámite quieres hacer?
            </h1>
            <p className="mx-auto mt-4 mb-10 max-w-[56ch] text-[17px] leading-relaxed text-[var(--text-secondary)]">
              Lo investigo en webs oficiales, te explico cada paso con su fuente y, si quieres, lo
              hago contigo en la sede electrónica.
            </p>
          </div>
          {app?.recordatorios.map((r) => (
            <button
              key={r.texto}
              type="button"
              onClick={() => void crear(r.sugerencia)}
              className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-[var(--warning)] px-5 py-4 text-left text-[var(--warning-foreground)] transition-[scale] active:scale-[0.98]"
            >
              <Icono nombre="aviso" />
              <span className="flex-1">
                <strong className="font-medium">{r.texto}</strong> Te ayudo a renovarlo.
              </span>
              <Icono nombre="siguiente" />
            </button>
          ))}
          <Compositor
            autoFocus
            placeholder="Por ejemplo: quiero pedir cita para renovar el DNI en Sevilla"
            ocupado={false}
            alEnviar={crear}
          />
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {SUGERENCIAS.map((s) => (
              <Button
                key={s}
                variant="outline"
                size="lg"
                className="rounded-full px-4"
                onClick={() => void crear(s)}
              >
                {s}
              </Button>
            ))}
          </div>
          <ul className="mt-16 grid grid-cols-3 gap-8 border-t border-border pt-8">
            {PROMESAS.map((p) => (
              <li key={p.titulo} className="text-sm">
                <Icono nombre={p.icono} className="text-brand" />
                <p className="mt-2 mb-1 text-[15px] font-medium">{p.titulo}</p>
                <p className="m-0 leading-relaxed text-muted-foreground">{p.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
