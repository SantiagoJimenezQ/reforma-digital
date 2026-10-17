import { useState } from 'react';
import { Button } from '@reforma-digital/design/ui/button';
import { Input } from '@reforma-digital/design/ui/input';
import { RadioGroup, RadioGroupItem } from '@reforma-digital/design/ui/radio-group';
import { Checkbox } from '@reforma-digital/design/ui/checkbox';
import type { Razonamiento } from '../shared/api';
import { Cabecera } from './datos';
import { useEstado } from './estado';
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
        <p className="m-0 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          De momento, el asistente usa {app.modeloNan}, un modelo abierto de NaN Builders, que no
          guarda las peticiones y funciona en la Unión Europea. Las búsquedas en webs oficiales las
          hace Exa.
        </p>
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

export function Ajustes() {
  const { app } = useEstado();
  if (!app) return null;
  const a = app.ajustes;
  const RAZONAMIENTO: { id: Razonamiento; nombre: string }[] = [
    { id: 'low', nombre: 'Rápido' },
    { id: 'medium', nombre: 'Equilibrado' },
    { id: 'high', nombre: 'Cuidadoso' },
  ];
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[760px] px-10 pb-16">
        <Cabecera titulo="Ajustes" entradilla="El modelo y los límites del asistente." />
        <section className="border-t border-border py-8">
          <Modelo />
        </section>
        <section className="space-y-6 border-t border-border py-8">
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-3 text-[15px] font-medium">Cuánto piensa antes de actuar</legend>
            <RadioGroup
              value={a.razonamiento}
              onValueChange={(v) => {
                if (v === 'low' || v === 'medium' || v === 'high')
                  void window.rd.guardarAjustes({ razonamiento: v });
              }}
              className="grid grid-cols-3 gap-3"
            >
              {RAZONAMIENTO.map((r) => (
                <label key={r.id} className={opcion}>
                  <RadioGroupItem value={r.id} className="mt-0.5" />
                  <span className="text-[15px]">{r.nombre}</span>
                </label>
              ))}
            </RadioGroup>
          </fieldset>
          <div>
            <label htmlFor="limite" className="mb-1.5 block text-[15px] font-medium">
              Gasto máximo por turno (dólares)
            </label>
            <Input
              id="limite"
              type="number"
              min={0.05}
              max={10}
              step={0.05}
              className="h-11 w-40 text-base"
              defaultValue={a.limiteTurnoUsd}
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (n >= 0.05 && n <= 10) void window.rd.guardarAjustes({ limiteTurnoUsd: n });
              }}
            />
            <p className="mt-1.5 mb-0 text-sm text-muted-foreground">
              Al llegar al límite, el asistente se para y te pregunta si sigue.
            </p>
          </div>
          <label className="flex items-start gap-3">
            <Checkbox
              checked={a.touchIdEnConfirmaciones}
              onCheckedChange={(v) =>
                void window.rd.guardarAjustes({ touchIdEnConfirmaciones: v === true })
              }
              className="mt-0.5"
            />
            <span>
              <span className="block text-[15px] font-medium">
                Pedir Touch ID para aprobar envíos, reservas, pagos y firmas
              </span>
              <span className="block text-sm text-muted-foreground">
                {app.touchId
                  ? 'Touch ID está disponible en este Mac.'
                  : 'Este Mac no tiene Touch ID: bastará con tu aprobación.'}
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <Checkbox
              checked={a.interfacesComunitarias}
              onCheckedChange={(v) =>
                void window.rd.guardarAjustes({ interfacesComunitarias: v === true })
              }
              className="mt-0.5"
            />
            <span>
              <span className="block text-[15px] font-medium">
                Interfaces comunitarias en las webs oficiales (experimental)
              </span>
              <span className="block text-sm leading-relaxed text-muted-foreground">
                Muestra en el navegador del trámite las interfaces más claras de Reforma Digital
                para la cita del DNI, Extranjería, la Agencia Tributaria y el Registro de
                Asociaciones. Conservan los controles oficiales y tienen «Ver original».
              </span>
            </span>
          </label>
        </section>
        <section className="border-t border-border py-8">
          <h2 className="mt-0 mb-3 text-[15px] font-medium">Privacidad</h2>
          <ul className="m-0 space-y-2 pl-5 text-[15px] leading-relaxed text-[var(--text-secondary)]">
            <li>
              Tus datos, conversaciones y trámites se guardan cifrados en este Mac. Las sesiones de
              las webs oficiales solo viven en memoria: al cerrar la app hay que volver a entrar.
            </li>
            <li>
              Al proveedor de IA solo le llegan marcadores en lugar de tus datos personales: los de
              Mis datos y los que un detector, que funciona en este Mac, encuentra en lo que
              escribes y en las webs (nombres, documentos, direcciones, teléfonos y correos). De los
              campos de texto solo ve lo que escribe él. Si el detector falla, no se envía nada.
            </li>
            <li>
              El asistente busca en toda la web y marca las que no son de la lista de webs
              oficiales. Para abrir una de ellas te pide permiso, y tus datos solo los escribe en
              webs oficiales.
            </li>
            <li>
              Contraseñas, CAPTCHA, certificados, firmas y pagos los haces tú en la web oficial.
            </li>
          </ul>
          {!app.modeloNan && (
            <div className="mt-6">
              <RetencionCero />
            </div>
          )}
        </section>
        <section className="border-t border-border pt-8">
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
