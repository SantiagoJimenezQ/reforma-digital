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

function seguridad(modeloNan: boolean): { icono: NombreIcono; titulo: string; texto: string }[] {
  return [
    {
      icono: 'ver',
      titulo: 'La IA no ve tus datos',
      texto:
        'Un modelo de privacidad que se ejecuta en tu Mac, sin conexión, cambia nombres, DNI, direcciones, teléfonos y correos por marcadores. Si falla, no se envía nada.',
    },
    {
      icono: 'candado',
      titulo: 'Todo cifrado en tu Mac',
      texto: 'Tus datos, conversaciones y trámites, con una clave protegida por tu llavero.',
    },
    {
      icono: 'huella',
      titulo: 'Tú das el permiso',
      texto: 'Nada se envía, reserva, paga ni firma sin tu aprobación con Touch ID.',
    },
    {
      icono: 'mano',
      titulo: 'Lo delicado lo haces tú',
      texto: 'Contraseñas, CAPTCHA, certificados, firmas y pagos. El asistente no los toca.',
    },
    {
      icono: 'web',
      titulo: 'Un navegador por trámite',
      texto: 'Cada trámite abre sus webs aparte, separado de tu navegador y de los demás trámites.',
    },
    ...(modeloNan
      ? [
          {
            icono: 'escudo' as const,
            titulo: 'IA en la Unión Europea',
            texto:
              'Modelos abiertos alojados en la UE, con retención cero: no guardan tus peticiones ni entrenan con ellas.',
          },
        ]
      : []),
  ];
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
                La IA solo ejecuta lo que le pides: busca, explica y rellena las webs. No lee tus
                datos ni los guarda.
              </p>
              <ul className="m-0 grid grid-cols-2 gap-3 p-0 text-left">
                {seguridad(Boolean(app?.modeloNan)).map((s) => (
                  <li
                    key={s.titulo}
                    className="flex list-none gap-4 rounded-[24px] bg-background p-6"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/[0.08] text-brand">
                      <Icono nombre={s.icono} />
                    </span>
                    <span>
                      <span className="block text-[17px] font-medium">{s.titulo}</span>
                      <span className="mt-1 block text-[15px] leading-relaxed text-[var(--text-secondary)]">
                        {s.texto}
                      </span>
                    </span>
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
