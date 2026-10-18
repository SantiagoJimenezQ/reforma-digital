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

/** Lo que no cabe en el recorrido del dato. */
const GARANTIAS: { icono: NombreIcono; texto: string }[] = [
  { icono: 'candado', texto: 'Todo cifrado en tu Mac, con tu llavero' },
  { icono: 'huella', texto: 'Nada se envía ni se paga sin Touch ID' },
  { icono: 'mano', texto: 'Contraseñas, CAPTCHA y firmas: tú' },
  { icono: 'web', texto: 'Un navegador aparte para cada trámite' },
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
const LETRAS = PETICION.reduce((n, p) => n + p.t.length, 0);
const POR_LETRA = 26;

/** Cada fase y cuánto dura, en milisegundos. Al acabar vuelve a empezar. */
const FASES = [
  ['aparece', 700],
  ['escribe', LETRAS * POR_LETRA + 600],
  ['envia', 450],
  ['detecta', 1300],
  ['oculta', 1400],
  ['llega', 1500],
  ['trabaja', 2200],
  ['listo', 1500],
  ['borra', 3600],
  ['sale', 600],
] as const;
type Fase = (typeof FASES)[number][0];
const orden = (f: Fase) => FASES.findIndex(([n]) => n === f);
const marcador = 'rounded-md bg-brand-yellow/25 px-1 font-mono text-sm';

const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Lo que pasa con una petición: se escribe, se ocultan los datos, la IA la hace y el servidor no la guarda. */
function Viaje({ modeloNan }: { modeloNan: boolean }) {
  // Sin movimiento, se queda en el momento que mejor lo explica.
  const [fase, setFase] = useState<Fase>(() => (quieto() ? 'listo' : 'aparece'));
  const [letras, setLetras] = useState(() => (quieto() ? LETRAS : 0));
  const p = orden(fase);
  useEffect(() => {
    if (quieto()) return;
    const t = setTimeout(() => {
      const siguiente = FASES[(p + 1) % FASES.length]![0];
      if (siguiente === 'aparece') setLetras(0);
      setFase(siguiente);
    }, FASES[p]![1]);
    return () => clearTimeout(t);
  }, [p]);
  useEffect(() => {
    if (fase !== 'escribe') return;
    const t = setInterval(() => setLetras((n) => Math.min(n + 1, LETRAS)), POR_LETRA);
    return () => clearInterval(t);
  }, [fase]);
  const enCompositor = p < orden('llega');
  let quedan = letras;
  const escrito = PETICION.map((parte, i) => {
    const visible = parte.t.slice(0, Math.max(0, quedan));
    quedan -= parte.t.length;
    if (!visible) return null;
    if (!parte.m) return <span key={i}>{visible}</span>;
    if (p >= orden('oculta'))
      return (
        <span
          key={`${i}m`}
          className={cn(marcador, 'animate-in duration-500 fade-in blur-in-sm zoom-in-90')}
        >
          {parte.m}
        </span>
      );
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
  const aviso =
    fase === 'detecta' ? (
      <Shimmer>Buscando tus datos en tu Mac, sin conexión…</Shimmer>
    ) : fase === 'oculta' ? (
      <>
        <Icono nombre="escudo" size={16} className="text-brand" />3 datos ocultos antes de enviar
      </>
    ) : null;
  return (
    <div
      aria-hidden="true"
      className={cn(
        'mx-auto max-w-[640px] text-left transition-opacity duration-500 motion-reduce:[&_*]:animate-none',
        fase === 'sale' && 'opacity-0',
      )}
    >
      {/* Lo que le llega a la IA, encima del compositor. */}
      <div className="flex h-[164px] flex-col justify-end">
        {p >= orden('llega') && (
          <div className="relative animate-in rounded-[24px] bg-background p-5 duration-700 fade-in slide-in-from-bottom-6">
            <div
              className={cn(
                'transition-[opacity,filter] duration-700',
                fase === 'borra' && 'opacity-0 blur-sm',
              )}
            >
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icono nombre="web" size={16} />
                {modeloNan ? 'Le llega a la IA, en la Unión Europea' : 'Le llega a la IA'}
              </span>
              <p className="mt-3 mb-0 text-[15px] leading-relaxed">
                {PETICION.map((parte, i) =>
                  parte.m ? (
                    <span key={i} className={marcador}>
                      {parte.m}
                    </span>
                  ) : (
                    parte.t
                  ),
                )}
              </p>
              <span className="mt-3 flex h-6 items-center text-sm">
                {p <= orden('trabaja') ? (
                  <Shimmer>Preparando el modelo 303…</Shimmer>
                ) : (
                  <span className="flex animate-in items-center gap-2 text-[var(--text-secondary)] duration-500 fade-in">
                    <Icono nombre="check" size={16} className="text-brand" />
                    Modelo 303 listo para que lo revises
                  </span>
                )}
              </span>
            </div>
            {fase === 'borra' && (
              <span className="absolute inset-0 flex animate-in flex-col items-center justify-center gap-2 text-center delay-300 duration-700 fill-mode-both fade-in zoom-in-95">
                <span className="grid size-10 place-items-center rounded-xl bg-brand/[0.08] text-brand">
                  <Icono nombre="papelera" />
                </span>
                <span className="text-[17px] font-medium">
                  {modeloNan ? 'Borrado del servidor' : 'Hecho, sin ver tus datos'}
                </span>
                <span className="text-sm text-[var(--text-secondary)]">
                  {modeloNan
                    ? 'Retención cero: no se guarda ni se usa para entrenar.'
                    : 'Tu conversación se queda cifrada en tu Mac.'}
                </span>
              </span>
            )}
          </div>
        )}
      </div>
      <div className="mt-3 animate-in rounded-[28px] bg-background duration-700 fade-in slide-in-from-bottom-4">
        <div className="min-h-[88px] px-5 pt-4 text-base leading-7">
          {enCompositor ? (
            <>
              {escrito}
              {fase === 'escribe' && (
                <span className="ml-px inline-block h-5 w-px translate-y-1 animate-pulse bg-foreground" />
              )}
            </>
          ) : (
            <span className="text-muted-foreground">Añade otra petición para cuando termine</span>
          )}
        </div>
        <div className="flex items-center px-2.5 pt-1 pb-2.5">
          <span className="flex h-8 items-center gap-1 px-2.5 text-sm text-muted-foreground">
            Equilibrado
            <Icono nombre="abajo" size={14} />
          </span>
          <span
            className={cn(
              'ml-auto grid size-9 place-items-center rounded-full bg-primary text-primary-foreground transition-[scale,opacity] duration-200',
              fase === 'envia' && 'scale-90',
              (!enCompositor || letras === 0) && 'opacity-30',
            )}
          >
            <Icono nombre="enviar" />
          </span>
        </div>
      </div>
      <p className="mt-3 mb-0 flex h-6 items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
        {aviso && (
          <span key={fase} className="flex animate-in items-center gap-2 duration-300 fade-in">
            {aviso}
          </span>
        )}
      </p>
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
              <ul className="m-0 mt-6 grid grid-cols-4 gap-6 p-0 text-left">
                {GARANTIAS.map((g) => (
                  <li key={g.texto} className="flex list-none gap-2.5 text-[15px] leading-snug">
                    <Icono nombre={g.icono} className="mt-px shrink-0 text-brand" />
                    {g.texto}
                  </li>
                ))}
              </ul>
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
