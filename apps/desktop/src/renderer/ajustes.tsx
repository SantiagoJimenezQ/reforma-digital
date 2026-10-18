import { useState, type ReactNode } from 'react';
import { Button } from '@reforma-digital/design/ui/button';
import { RadioGroup, RadioGroupItem } from '@reforma-digital/design/ui/radio-group';
import { Checkbox } from '@reforma-digital/design/ui/checkbox';
import { cn } from '@reforma-digital/design/lib/utils';
import { Cabecera } from './datos';
import { useEstado } from './estado';
import { dolares } from './formato';
import { Icono } from './icono';

/** Modelos probados con las evaluaciones del agente (pnpm eval:agent). */
const MODELOS = [
  {
    id: 'openai/gpt-6-luna',
    nombre: 'GPT-6 Luna',
    nota: 'Recomendado: el mejor resultado y el menor coste en nuestras evaluaciones.',
  },
  {
    id: 'anthropic/claude-haiku-5.5',
    nombre: 'Claude Haiku 5.5',
    nota: 'Rápido. Algo menos preciso en nuestras evaluaciones.',
  },
  {
    id: 'anthropic/claude-sonnet-5.5',
    nombre: 'Claude Sonnet 5.5',
    nota: 'Más capaz y bastante más caro.',
  },
  { id: 'openai/gpt-6.1-sol', nombre: 'GPT-6.1 Sol', nota: 'Más capaz y bastante más caro.' },
];
const opcion =
  'flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background p-4 has-data-checked:border-foreground';

function Modelo() {
  const { app } = useEstado();
  if (!app) return null;
  if (app.modeloNan)
    return (
      <div>
        <h2 className="mt-0 mb-3 text-[15px] font-medium">Modelo</h2>
        <ul className="m-0 list-disc space-y-2 pl-5 text-[15px] marker:text-muted-foreground leading-relaxed text-[var(--text-secondary)]">
          <li>Usamos modelos abiertos, alojados en la Unión Europea.</li>
          <li>
            Con ZDR (retención cero de datos): el proveedor no guarda tus peticiones ni entrena con
            ellas.
          </li>
        </ul>
      </div>
    );
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-3 text-[15px] font-medium">Modelo</legend>
      <RadioGroup
        value={app.ajustes.modelo}
        onValueChange={(v) => void window.rd.guardarAjustes({ modelo: String(v) })}
        className="grid gap-2"
      >
        {MODELOS.map((m) => (
          <label key={m.id} className={opcion}>
            <RadioGroupItem value={m.id} className="mt-0.5" />
            <span>
              <span className="block text-[15px] font-medium">{m.nombre}</span>
              <span className="block text-sm text-muted-foreground">{m.nota}</span>
            </span>
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}

/** Solo se activa si el proveedor la acepta: con un plan que no la permite, la IA dejaría de responder. */
function RetencionCero() {
  const { app } = useEstado();
  const [estado, setEstado] = useState<{ probando: boolean; error?: string }>({ probando: false });
  if (!app) return null;
  const a = app.ajustes;
  const cambiar = async (activar: boolean) => {
    if (activar) {
      setEstado({ probando: true });
      const prueba = await window.rd.probarConexion({ modelo: a.modelo, retencionCero: true });
      if (!prueba.ok) return setEstado({ probando: false, error: prueba.error });
    }
    setEstado({ probando: false });
    await window.rd.guardarAjustes({ retencionCero: activar });
  };
  return (
    <div>
      <label className="flex items-start gap-3">
        <Checkbox
          checked={a.retencionCero}
          disabled={estado.probando}
          onCheckedChange={(v) => void cambiar(v === true)}
          className="mt-0.5"
        />
        <span>
          <span className="block text-[15px] font-medium">
            {estado.probando
              ? 'Comprobando con el proveedor…'
              : 'Exigir que el proveedor de IA no guarde las peticiones'}
          </span>
          <span className="block text-sm leading-relaxed text-muted-foreground">
            Retención cero: solo se usan proveedores que borran cada petición al responder. En
            Vercel AI Gateway exige el plan Pro. Sin ella, la app ya pide que no se entrene con tus
            peticiones.
          </span>
        </span>
      </label>
      {estado.error && (
        <p role="alert" className="mt-2 mb-0 ml-8 text-sm text-destructive">
          {estado.error}
        </p>
      )}
    </div>
  );
}

/** Un ajuste de sí o no, con su explicación debajo. */
function Opcion({
  activo,
  alCambiar,
  titulo,
  children,
  proximamente = false,
}: {
  activo: boolean;
  alCambiar?: (v: boolean) => void;
  titulo: string;
  children: ReactNode;
  proximamente?: boolean;
}) {
  return (
    <label className={cn('flex items-start gap-3', proximamente && 'opacity-60')}>
      <Checkbox
        checked={activo}
        disabled={proximamente}
        onCheckedChange={(v) => alCambiar?.(v === true)}
        className="mt-0.5"
      />
      <span>
        <span className="flex items-center gap-2 text-[15px] font-medium">
          {titulo}
          {proximamente && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              Próximamente
            </span>
          )}
        </span>
        <span className="block text-sm leading-relaxed text-muted-foreground">{children}</span>
      </span>
    </label>
  );
}

export function Ajustes() {
  const { app } = useEstado();
  if (!app) return null;
  const a = app.ajustes;
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[760px] px-10 pb-16">
        <Cabecera titulo="Ajustes" entradilla="Cómo trabaja el asistente y qué guarda la app." />
        <section className="mb-3 flex flex-col gap-6 rounded-[24px] bg-background p-6">
          <Opcion
            activo={a.touchIdEnConfirmaciones}
            alCambiar={(v) => void window.rd.guardarAjustes({ touchIdEnConfirmaciones: v })}
            titulo="Pedir Touch ID para aprobar envíos, reservas, pagos y firmas"
          >
            {app.touchId
              ? 'Touch ID está disponible en este Mac.'
              : 'Este Mac no tiene Touch ID: bastará con tu aprobación.'}
          </Opcion>
          <Opcion
            activo={a.cerrarSesiones}
            alCambiar={(v) => void window.rd.guardarAjustes({ cerrarSesiones: v })}
            titulo="Cerrar las sesiones de las webs al cerrar la app"
          >
            Si lo activas, al volver a abrir la app tendrás que iniciar sesión otra vez en las webs
            de tus trámites. Si no, siguen abiertas, guardadas en este Mac.
          </Opcion>
          <Opcion activo={false} titulo="Interfaces comunitarias" proximamente>
            Interfaces más claras de Reforma Digital para algunas webs oficiales, como la cita del
            DNI o la Agencia Tributaria, sin quitar sus controles.
          </Opcion>
        </section>
        <section className="mb-3 rounded-[24px] bg-background p-6">
          <Modelo />
          {!app.modeloNan && (
            <div className="mt-6">
              <RetencionCero />
            </div>
          )}
          {app.desarrollo && (
            <p className="mt-4 mb-0 text-sm text-muted-foreground">
              Gasto en IA de todos tus trámites:{' '}
              {dolares(app.tramites.reduce((n, t) => n + t.costeUsd, 0))}
            </p>
          )}
        </section>
        <section className="mb-3 rounded-[24px] bg-background p-6">
          <h2 className="mt-0 mb-3 text-[15px] font-medium">Privacidad</h2>
          <ul className="m-0 list-disc space-y-2 pl-5 text-[15px] marker:text-muted-foreground leading-relaxed text-[var(--text-secondary)]">
            <li>Tus datos, conversaciones y trámites se guardan cifrados en este Mac.</li>
            <li>
              La IA no ve tu nombre, tu DNI, tu dirección, tu teléfono ni tu correo: le llegan
              marcadores en su lugar.
            </li>
            <li>
              Un detector que funciona en este Mac también los tapa en lo que escribes y en las
              webs, aunque sean de otras personas. Si falla, no se envía nada.
            </li>
            <li>La app pone el dato real solo al escribirlo en la web del trámite.</li>
            <li>Nada se envía, reserva, paga ni firma sin tu aprobación.</li>
            <li>Contraseñas, CAPTCHA, certificados, firmas y pagos los haces tú.</li>
          </ul>
        </section>
        <section className="pt-5">
          <Button
            variant="destructive"
            size="lg"
            onClick={() => {
              if (
                confirm(
                  '¿Borrar todo? Se borran tus datos, los trámites, las sesiones del navegador y los ajustes. No se puede deshacer.',
                )
              )
                void window.rd.borrarDatos('todo');
            }}
          >
            <Icono nombre="papelera" />
            Borrar todo y empezar de cero
          </Button>
          <p className="mt-6 mb-0 text-sm text-muted-foreground">
            Reforma Digital para Mac {app.version} · Código abierto con licencia MIT · Proyecto
            independiente, sin vinculación con la Administración.
          </p>
        </section>
      </div>
    </div>
  );
}
