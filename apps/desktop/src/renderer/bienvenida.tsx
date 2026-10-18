import { useEffect, useRef, useState } from 'react';
import { Button } from '@reforma-digital/design/ui/button';
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

const dato = 'rounded-md bg-brand/[0.1] px-1 text-brand';
const marcador = 'rounded-md bg-brand-yellow/[0.25] px-1 font-mono text-sm';

/** Un dato inventado de camino a la web: lo que escribes, lo que recibe la IA y lo que se escribe. */
function Recorrido({ modeloNan }: { modeloNan: boolean }) {
  const etapas = [
    {
      donde: 'Escribes en tu Mac',
      como: 'Un modelo de privacidad, sin conexión, encuentra tus datos y los cambia por marcadores.',
      muestra: (
        <p className="m-0">
          Soy <span className={dato}>Lucía Martín</span> y mi DNI es{' '}
          <span className={dato}>12345678Z</span>. Quiero renovarlo.
        </p>
      ),
    },
    {
      donde: 'Le llega a la IA',
      como: modeloNan
        ? 'Sabe que hay un dato, no cuál es. Modelos abiertos en la UE que no guardan nada.'
        : 'Sabe que hay un dato, no cuál es. Si el modelo de privacidad falla, no se envía nada.',
      muestra: (
        <p className="m-0">
          Soy <span className={marcador}>{'{{nombre}}'}</span> y mi DNI es{' '}
          <span className={marcador}>{'{{documento_numero}}'}</span>. Quiero renovarlo.
        </p>
      ),
    },
    {
      donde: 'Se escribe en la web',
      como: 'La app pone el dato real solo en la web del trámite, y nada se envía sin tu permiso.',
      muestra: (
        <>
          <span className="block text-sm text-muted-foreground">Número de DNI</span>
          <span className="mt-1.5 flex h-10 items-center justify-between rounded-xl border border-border bg-background px-3">
            12345678Z
            <Icono nombre="candado" size={16} className="text-muted-foreground" />
          </span>
        </>
      ),
    },
  ];
  return (
    <ol className="m-0 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch rounded-[24px] bg-background p-3 text-left">
      {etapas.map((e, i) => (
        <li key={e.donde} className="contents">
          {i > 0 && (
            <span aria-hidden="true" className="mt-[100px] self-start px-1 text-muted-foreground">
              <Icono nombre="siguiente" size={16} />
            </span>
          )}
          <span className="flex flex-col p-4">
            <span className="text-sm text-muted-foreground">
              {i + 1}. {e.donde}
            </span>
            <span className="mt-3 flex h-32 flex-col justify-center rounded-2xl bg-muted p-4 text-[15px] leading-relaxed">
              {e.muestra}
            </span>
            <span className="mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
              {e.como}
            </span>
          </span>
        </li>
      ))}
    </ol>
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
                La IA solo ejecuta lo que le pides: busca, explica y rellena las webs. Así viaja un
                dato tuyo:
              </p>
              <Recorrido modeloNan={Boolean(app?.modeloNan)} />
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
