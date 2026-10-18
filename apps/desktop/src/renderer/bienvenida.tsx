import { useEffect, useRef, useState } from 'react';
import { Button } from '@reforma-digital/design/ui/button';
import { Shimmer } from '@reforma-digital/design/chat';
import { cn } from '@reforma-digital/design/lib/utils';
import { useEstado } from './estado';
import { Icono, Marca, type NombreIcono } from './icono';

const COMO: { icono: NombreIcono; titulo: string; texto: string; amarillo?: boolean }[] = [
  {
    icono: 'buscar',
    titulo: 'Le cuentas qué necesitas',
    texto: 'Busca en las webs de la Administración y te explica qué hace falta y dónde.',
  },
  {
    icono: 'web',
    amarillo: true,
    titulo: 'Abre la web y la rellena',
    texto: 'Con lo que guardaste en Mis datos, en un navegador dentro de la app y a la vista.',
  },
  {
    icono: 'huella',
    titulo: 'Tú decides',
    texto: 'Antes de enviar, reservar, pagar o firmar, te pide permiso.',
  },
];

/** Lo que cambia frente a un asistente general. Solo afirmaciones que valen para cualquiera de ellos. */
const COMPARACION: { que: string; general: string; nuestro: string }[] = [
  {
    que: 'Tus datos',
    general: 'Le llega lo que escribes y lo que ve, con tu nombre y tu DNI.',
    nuestro: 'Le llegan marcadores como {{nombre}}; el dato real lo pone la app en la web.',
  },
  {
    que: 'Tus conversaciones',
    general: 'Van al proveedor y se guardan según su política.',
    nuestro: 'La IA no recibe tus datos y el historial queda cifrado en tu Mac.',
  },
  {
    que: 'Los trámites',
    general: 'Sabe de todo un poco; el trámite se lo explicas tú.',
    nuestro: 'Hecho para trámites en España, con las webs oficiales que consulta a la vista.',
  },
  {
    que: 'Envíos y pagos',
    general: 'Depende de la herramienta y de cómo la configures.',
    nuestro: 'Siempre con tu aprobación y Touch ID. Contraseñas, CAPTCHA y firmas, tú.',
  },
];

/** La petición de ejemplo, con datos inventados; `m` es el marcador que le llega a la IA. */
const PETICION: { t: string; m?: string }[] = [
  { t: 'Soy ' },
  { t: 'Lucía Martín', m: '{{nombre}}' },
  { t: ', autónoma, con DNI ' },
  { t: '12345678Z', m: '{{documento_numero}}' },
  { t: '. Preséntame la trimestral del IVA y domicilia el pago en ' },
  { t: 'ES91 2100 0418 4502 0005 1332', m: '{{iban}}' },
  { t: '.' },
];
/** Lo que pide la IA en su formulario, también inventado. */
const CAMPOS = [
  { etiqueta: 'Ingresos del trimestre, sin IVA', valor: '4.250,00 €' },
  { etiqueta: 'IVA de tus gastos', valor: '310,00 €' },
];
const LETRAS = PETICION.reduce((n, p) => n + p.t.length, 0);
const CIFRAS = CAMPOS.reduce((n, c) => n + c.valor.length, 0);
const POR_LETRA = 26;
const POR_CIFRA = 60;

/** Cada fase y cuánto dura, en milisegundos. Al acabar vuelve a empezar. */
const FASES = [
  ['aparece', 700],
  ['escribe', LETRAS * POR_LETRA + 500],
  ['envia', 400],
  ['detecta', 1000],
  ['cifra', 1500],
  ['llega', 1000],
  ['rellena', CIFRAS * POR_CIFRA + 500],
  ['pulsa', 450],
  ['huella', 1600],
  ['aprobado', 700],
  ['exito', 3600],
  ['sale', 600],
] as const;
type Fase = (typeof FASES)[number][0];
const orden = (f: Fase) => FASES.findIndex(([n]) => n === f);
const marcador = 'rounded-md bg-brand-yellow/25 px-1 font-mono text-sm';
const SIGNOS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&*+=?';

const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Un dato que se cifra a la vista: las letras cambian al azar hasta quedar en su marcador. */
function Cifrado({ de, a }: { de: string; a: string }) {
  const [texto, setTexto] = useState(de);
  const [hecho, setHecho] = useState(false);
  useEffect(() => {
    const pasos = 16;
    let paso = 0;
    const t = setInterval(() => {
      paso += 1;
      const largo = Math.round(de.length + ((a.length - de.length) * paso) / pasos);
      const fijas = Math.floor((a.length * paso) / pasos);
      setTexto(
        Array.from({ length: largo }, (_, i) =>
          i < fijas ? a[i] : SIGNOS[Math.floor(Math.random() * SIGNOS.length)],
        ).join(''),
      );
      if (paso >= pasos) {
        clearInterval(t);
        setTexto(a);
        setHecho(true);
      }
    }, 55);
    return () => clearInterval(t);
  }, [de, a]);
  return (
    <span
      className={cn(
        'rounded-md px-1 font-mono text-sm transition-colors duration-300',
        hecho ? 'bg-brand-yellow/25' : 'bg-brand/10 text-brand',
      )}
    >
      {texto}
    </span>
  );
}

/** El anillo de Touch ID: se llena al tocar el sensor y acaba en un check. */
function Huella({ aprobado }: { aprobado: boolean }) {
  const [lleno, setLleno] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setLleno(true));
    return () => cancelAnimationFrame(r);
  }, []);
  const vuelta = 2 * Math.PI * 34;
  return (
    <span className="relative grid size-[76px] place-items-center">
      <svg viewBox="0 0 76 76" className="absolute inset-0 -rotate-90">
        <circle cx="38" cy="38" r="34" fill="none" stroke="var(--border)" strokeWidth="3" />
        <circle
          cx="38"
          cy="38"
          r="34"
          fill="none"
          stroke="var(--brand)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={vuelta}
          strokeDashoffset={lleno ? 0 : vuelta}
          className="transition-[stroke-dashoffset] duration-[1300ms] ease-out"
        />
      </svg>
      {aprobado ? (
        <Icono
          key="check"
          nombre="check"
          size={30}
          className="animate-in text-brand duration-300 zoom-in-50"
        />
      ) : (
        <Icono nombre="huella" size={34} className="text-brand" />
      )}
    </span>
  );
}

/** Lo que pasa con una petición: se ocultan los datos, la IA pide lo que falta y tú lo apruebas. */
function Viaje({ modeloNan }: { modeloNan: boolean }) {
  // Cada vuelta monta la escena de nuevo, desde el principio.
  const [vuelta, setVuelta] = useState(0);
  return <Escena key={vuelta} modeloNan={modeloNan} alAcabar={() => setVuelta((v) => v + 1)} />;
}

function Escena({ modeloNan, alAcabar }: { modeloNan: boolean; alAcabar: () => void }) {
  // Sin movimiento, se queda en el momento que mejor lo explica.
  const [fase, setFase] = useState<Fase>(() => (quieto() ? 'exito' : 'aparece'));
  const [letras, setLetras] = useState(() => (quieto() ? LETRAS : 0));
  const [cifras, setCifras] = useState(() => (quieto() ? CIFRAS : 0));
  const p = orden(fase);
  useEffect(() => {
    if (quieto()) return;
    const t = setTimeout(() => {
      const siguiente = FASES[p + 1];
      if (siguiente) setFase(siguiente[0]);
      else alAcabar();
    }, FASES[p]![1]);
    return () => clearTimeout(t);
  }, [p, alAcabar]);
  useEffect(() => {
    if (fase !== 'escribe' && fase !== 'rellena') return;
    const [poner, tope, ritmo] =
      fase === 'escribe' ? [setLetras, LETRAS, POR_LETRA] : [setCifras, CIFRAS, POR_CIFRA];
    const t = setInterval(() => poner((n) => Math.min(n + 1, tope)), ritmo);
    return () => clearInterval(t);
  }, [fase]);
  const grande = p < orden('llega');
  let quedan = letras;
  const escrito = PETICION.map((parte, i) => {
    const visible = parte.t.slice(0, Math.max(0, quedan));
    quedan -= parte.t.length;
    if (!visible) return null;
    if (!parte.m) return <span key={i}>{visible}</span>;
    if (p >= orden('cifra')) return <Cifrado key={`${i}c`} de={parte.t} a={parte.m} />;
    return (
      <span
        key={i}
        className={cn(
          'rounded-md px-0.5 transition-colors duration-300',
          p >= orden('detecta') && 'bg-brand/10 text-brand',
        )}
      >
        {visible}
      </span>
    );
  });
  let sinEscribir = cifras;
  const valores = CAMPOS.map((c) => {
    const v = c.valor.slice(0, Math.max(0, sinEscribir));
    sinEscribir -= c.valor.length;
    return {
      ...c,
      v,
      escribiendo: fase === 'rellena' && v.length > 0 && v.length < c.valor.length,
    };
  });
  const cursor = (
    <span className="ml-px inline-block h-5 w-px translate-y-1 animate-pulse bg-foreground" />
  );
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative mx-auto h-[400px] max-w-[600px] text-left transition-opacity duration-500 motion-reduce:[&_*]:animate-none',
        fase === 'sale' && 'opacity-0',
      )}
    >
      {/* La tarjeta del asistente: pide lo que falta, se aprueba con Touch ID y confirma. */}
      {!grande && (
        <div className="absolute inset-x-0 top-0 flex h-[328px] animate-in flex-col rounded-[24px] bg-background p-6 delay-300 duration-700 fill-mode-both fade-in slide-in-from-bottom-6">
          {p < orden('huella') && (
            <>
              <div className="flex items-start gap-3">
                <Marca size={28} />
                <span>
                  <span className="block text-[17px] font-medium">Necesito dos datos más</span>
                  <span className="block text-[15px] text-[var(--text-secondary)]">
                    Para presentar el modelo 303 del tercer trimestre.
                  </span>
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {valores.map((c) => (
                  <span key={c.etiqueta}>
                    <span className="block text-sm text-[var(--text-secondary)]">{c.etiqueta}</span>
                    <span
                      className={cn(
                        'mt-1.5 flex h-10 items-center rounded-xl border px-3 text-[15px]',
                        c.escribiendo ? 'border-foreground' : 'border-border',
                      )}
                    >
                      {c.v}
                      {c.escribiendo && cursor}
                    </span>
                  </span>
                ))}
              </div>
              <div className="mt-auto flex justify-end gap-2">
                <span className="flex h-9 items-center rounded-full px-4 text-[15px] text-[var(--text-secondary)]">
                  Ahora no
                </span>
                <span
                  className={cn(
                    'flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-[15px] text-primary-foreground transition-[scale,opacity] duration-200',
                    fase === 'pulsa' && 'scale-95',
                    p < orden('pulsa') && cifras < CIFRAS && 'opacity-40',
                  )}
                >
                  <Icono nombre="huella" size={16} />
                  Presentar con Touch ID
                </span>
              </div>
            </>
          )}
          {(fase === 'huella' || fase === 'aprobado') && (
            <div className="flex flex-1 animate-in flex-col items-center justify-center gap-4 text-center duration-300 fade-in zoom-in-95">
              <Huella aprobado={fase === 'aprobado'} />
              <span>
                <span className="block text-[17px] font-medium">
                  {fase === 'aprobado' ? 'Aprobado' : 'Touch ID'}
                </span>
                <span className="block text-[15px] text-[var(--text-secondary)]">
                  Para presentar el modelo 303 a la Agencia Tributaria
                </span>
              </span>
            </div>
          )}
          {p >= orden('exito') && (
            <div className="flex flex-1 animate-in flex-col items-center justify-center text-center duration-500 fade-in slide-in-from-bottom-3">
              <span className="grid size-14 place-items-center rounded-full bg-success-bg text-success-fg">
                <Icono nombre="check" size={28} />
              </span>
              <span className="mt-4 font-heading text-[28px] leading-tight">
                Trimestral presentada
              </span>
              <span className="mt-2 text-[15px] text-[var(--text-secondary)]">
                Modelo 303 · 582,50 € a ingresar
                <br />
                Se carga en tu cuenta ···· 1332 el 20 de octubre
              </span>
              <span className="mt-4 flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm text-[var(--text-secondary)]">
                <Icono nombre="papelera" size={14} />
                {modeloNan
                  ? 'La IA no ha guardado nada: retención cero'
                  : 'La IA solo ha visto marcadores'}
              </span>
            </div>
          )}
        </div>
      )}
      {/* El compositor: grande en el centro mientras escribes; al enviar, pequeño y abajo. */}
      <div
        className={cn(
          'absolute inset-x-0 mx-auto animate-in overflow-hidden rounded-[28px] bg-background duration-700 fade-in slide-in-from-bottom-4 [transition:top_700ms_var(--ease-brand),width_700ms_var(--ease-brand),height_700ms_var(--ease-brand)]',
          grande ? 'top-[124px] h-[152px] w-full' : 'top-[352px] h-12 w-[440px]',
        )}
      >
        {p <= orden('llega') && (
          <div
            className={cn(
              'absolute inset-x-0 top-0 h-[152px] transition-opacity duration-300',
              !grande && 'opacity-0',
            )}
          >
            <div className="px-5 pt-4 text-base leading-7">
              {escrito}
              {fase === 'escribe' && cursor}
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-5 pb-2.5 text-sm text-[var(--text-secondary)]">
              {fase === 'detecta' && <Shimmer>Buscando tus datos en tu Mac, sin conexión…</Shimmer>}
              {fase === 'cifra' && (
                <span className="flex animate-in items-center gap-2 duration-300 fade-in">
                  <Icono nombre="escudo" size={16} className="text-brand" />3 datos ocultos antes de
                  enviar
                </span>
              )}
              <span
                className={cn(
                  'ml-auto grid size-9 place-items-center rounded-full bg-primary text-primary-foreground transition-[scale,opacity] duration-200',
                  fase === 'envia' && 'scale-90',
                  letras === 0 && 'opacity-30',
                )}
              >
                <Icono nombre="enviar" />
              </span>
            </div>
          </div>
        )}
        {!grande && (
          <div className="absolute inset-0 flex animate-in items-center gap-2 pr-2 pl-5 text-[15px] text-muted-foreground delay-300 duration-500 fill-mode-both fade-in">
            Añade otra petición para cuando termine
            <span className="ml-auto grid size-8 place-items-center rounded-full bg-primary text-primary-foreground opacity-30">
              <Icono nombre="enviar" size={16} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const PASOS = ['Bienvenida', 'Por qué', 'Seguridad'];

/** Se enseña una vez, al abrir la app por primera vez. */
export function Bienvenida({ alTerminar }: { alTerminar: () => void }) {
  const { app } = useEstado();
  const [paso, setPaso] = useState(0);
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => titulo.current?.focus(), [paso]);
  const ultimo = paso === PASOS.length - 1;
  const h1 =
    'm-0 font-heading text-[40px] leading-[1.1] font-normal tracking-[-0.02em] outline-none';
  const entradilla = 'mx-auto mt-4 mb-8 max-w-[56ch] text-[17px] leading-relaxed';
  return (
    <div className="flex h-full flex-col bg-muted">
      <div className="arrastrar flex h-[52px] shrink-0 items-center justify-center">
        <ol aria-label="Pasos" className="m-0 flex gap-2 p-0">
          {PASOS.map((p, i) => (
            <li
              key={p}
              aria-current={i === paso ? 'step' : undefined}
              className={cn(
                'h-1.5 list-none rounded-full transition-[width,background-color]',
                i === paso ? 'w-6 bg-foreground' : 'w-1.5 bg-foreground/20',
              )}
            >
              <span className="sr-only">{p}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-10">
        <div className="my-auto w-full max-w-[820px] py-8 text-center">
          {paso === 0 && (
            <>
              <div className="mb-6 flex justify-center">
                <Marca size={48} />
              </div>
              <h1 ref={titulo} tabIndex={-1} className={h1}>
                Tus trámites, hechos contigo
              </h1>
              <p className={cn(entradilla, 'text-[var(--text-secondary)]')}>
                Un asistente que investiga el trámite en las webs oficiales, te explica los pasos y
                rellena los formularios por ti, sin que tus datos salgan de tu Mac.
              </p>
              <ul className="m-0 grid grid-cols-3 gap-3 p-0 text-left">
                {COMO.map((c, i) => (
                  <li key={c.titulo} className="list-none rounded-[24px] bg-background p-6">
                    <span className="mb-4 flex items-center justify-between">
                      <span
                        className={cn(
                          'grid size-10 place-items-center rounded-xl',
                          c.amarillo
                            ? 'bg-brand-yellow/[0.15] text-brand-yellow'
                            : 'bg-brand/[0.08] text-brand',
                        )}
                      >
                        <Icono nombre={c.icono} />
                      </span>
                      <span className="text-sm text-muted-foreground">{i + 1}</span>
                    </span>
                    <span className="block text-[17px] font-medium">{c.titulo}</span>
                    <span className="mt-1 block text-[15px] leading-relaxed text-[var(--text-secondary)]">
                      {c.texto}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {paso === 1 && (
            <>
              <h1 ref={titulo} tabIndex={-1} className={h1}>
                ¿Por qué no ChatGPT, Claude o Codex?
              </h1>
              <p className={cn(entradilla, 'text-[var(--text-secondary)]')}>
                Son muy buenos asistentes generales. Para un trámite, con tu DNI y tus datos, este
                está hecho a propósito.
              </p>
              <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-[24px] bg-background text-left text-[15px] leading-relaxed">
                <thead>
                  <tr>
                    <th className="w-[22%] px-5 pt-4 pb-3" />
                    <th className="px-5 pt-4 pb-3 font-medium text-muted-foreground">
                      Un asistente general
                    </th>
                    <th className="px-5 pt-4 pb-3 font-medium">
                      <span className="flex items-center gap-2">
                        <Marca size={16} />
                        Reforma Digital
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARACION.map((c) => (
                    <tr key={c.que}>
                      <th className="border-t border-border px-5 py-4 align-top font-medium">
                        {c.que}
                      </th>
                      <td className="border-t border-border px-5 py-4 align-top text-muted-foreground">
                        {c.general}
                      </td>
                      <td className="border-t border-border bg-brand/[0.04] px-5 py-4 align-top">
                        <span className="relative block pl-6">
                          <Icono
                            nombre="check"
                            size={16}
                            className="absolute top-1 left-0 text-brand"
                          />
                          {c.nuestro}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {ultimo && (
            <>
              <h1 ref={titulo} tabIndex={-1} className={h1}>
                Tu seguridad, primero
              </h1>
              <p className={cn(entradilla, 'text-[var(--text-secondary)]')}>
                Así viaja una petición con tus datos.
              </p>
              <Viaje modeloNan={Boolean(app?.modeloNan)} />
              <p className="mt-6 mb-0 text-[15px] text-muted-foreground">
                Es código abierto: puedes comprobarlo todo en{' '}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() =>
                    void window.rd.abrirEnlace('https://github.com/samuelcorsan/reforma-digital')
                  }
                >
                  github.com/samuelcorsan/reforma-digital
                </button>
                .
              </p>
            </>
          )}
        </div>
      </div>
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-10 pt-2 pb-8">
        <div>
          {paso > 0 && (
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Atrás"
              title="Atrás"
              className="rounded-full hover:bg-foreground/[0.06]"
              onClick={() => setPaso(paso - 1)}
            >
              <Icono nombre="atras" />
            </Button>
          )}
        </div>
        <Button
          variant={ultimo ? 'sunset' : 'default'}
          size="lg"
          className="min-w-40 rounded-full px-4 text-[15px]"
          onClick={() => (ultimo ? alTerminar() : setPaso(paso + 1))}
        >
          {ultimo ? 'Empezar' : 'Continuar'}
        </Button>
      </div>
    </div>
  );
}
