import { useState } from 'react';
import { Button } from '@reforma-digital/design/ui/button';
import { Input } from '@reforma-digital/design/ui/input';
import { RadioGroup, RadioGroupItem } from '@reforma-digital/design/ui/radio-group';
import { Checkbox } from '@reforma-digital/design/ui/checkbox';
import type { Proveedor, Razonamiento } from '../shared/api';
import { Cabecera } from './datos';
import { useEstado } from './estado';
import { Icono, Marca } from './icono';
import { PROMESAS } from './inicio';

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
const PROVEEDORES: { id: Proveedor; nombre: string; ayuda: string }[] = [
  { id: 'gateway', nombre: 'Vercel AI Gateway', ayuda: 'Clave de vercel.com' },
  { id: 'openrouter', nombre: 'OpenRouter', ayuda: 'Clave de openrouter.ai' },
];

const opcion =
  'flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background p-4 has-data-checked:border-foreground';

function FormProveedor({ conModelo = true }: { conModelo?: boolean }) {
  const { app } = useEstado();
  const a = app?.ajustes;
  const [proveedor, setProveedor] = useState<Proveedor>(a?.proveedor ?? 'gateway');
  const [clave, setClave] = useState('');
  const [modelo, setModelo] = useState(a?.modelo ?? MODELOS[0]!.id);
  const [estado, setEstado] = useState<{
    tipo: 'nada' | 'probando' | 'ok' | 'error';
    texto?: string;
  }>({ tipo: 'nada' });
  const guardar = async () => {
    setEstado({ tipo: 'probando' });
    const prueba = await window.rd.probarConexion({
      proveedor,
      modelo,
      ...(clave ? { clave } : {}),
    });
    if (!prueba.ok)
      return setEstado({ tipo: 'error', texto: prueba.error ?? 'No se ha podido conectar.' });
    const r = await window.rd.guardarAjustes({ proveedor, modelo, ...(clave ? { clave } : {}) });
    if (!r.ok) return setEstado({ tipo: 'error', texto: r.error });
    setClave('');
    setEstado({ tipo: 'ok', texto: 'Conectado y guardado.' });
  };
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
    >
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-3 text-[15px] font-medium">Proveedor de IA</legend>
        <RadioGroup
          value={proveedor}
          onValueChange={(v) => setProveedor(v === 'openrouter' ? 'openrouter' : 'gateway')}
          className="grid grid-cols-2 gap-3"
        >
          {PROVEEDORES.map((p) => (
            <label key={p.id} className={opcion}>
              <RadioGroupItem value={p.id} className="mt-0.5" />
              <span>
                <span className="block text-[15px] font-medium">{p.nombre}</span>
                <span className="block text-sm leading-relaxed text-muted-foreground">
                  {p.ayuda}
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </fieldset>
      <div>
        <label htmlFor="clave" className="mb-1.5 block text-[15px] font-medium">
          Clave del proveedor
        </label>
        <Input
          id="clave"
          type="password"
          className="h-11 text-base"
          autoComplete="off"
          placeholder={
            a?.claveGuardada ? 'Guardada. Escribe otra para cambiarla' : 'Pega aquí tu clave'
          }
          value={clave}
          onChange={(e) => setClave(e.target.value)}
        />
        <p className="mt-1.5 mb-0 text-sm text-muted-foreground">
          Se guarda cifrada en este Mac. Las peticiones van directamente a tu proveedor: Reforma
          Digital no tiene servidores intermedios.
        </p>
      </div>
      {conModelo && (
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-3 text-[15px] font-medium">Modelo</legend>
          <RadioGroup
            value={modelo}
            onValueChange={(v) => setModelo(String(v))}
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
      )}
      <div className="flex items-center gap-4">
        <Button
          type="submit"
          variant="sunset"
          size="lg"
          disabled={estado.tipo === 'probando' || (!clave && !a?.claveGuardada)}
        >
          {estado.tipo === 'probando' ? 'Comprobando…' : 'Probar y guardar'}
        </Button>
        {estado.texto && (
          <p
            role={estado.tipo === 'error' ? 'alert' : 'status'}
            className={
              estado.tipo === 'error'
                ? 'm-0 text-sm text-destructive'
                : 'm-0 text-sm text-muted-foreground'
            }
          >
            {estado.texto}
          </p>
        )}
      </div>
    </form>
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
        <Cabecera
          titulo="Ajustes"
          entradilla="El proveedor de IA, el modelo y los límites del asistente."
        />
        <section className="border-t border-border py-8">
          <FormProveedor />
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
            <li>Tus datos, conversaciones y trámites se guardan cifrados en este Mac.</li>
            <li>
              Al proveedor de IA solo le llegan marcadores en lugar de tus identificadores. Antes de
              cada petición, la app comprueba que no se le escapa ninguno.
            </li>
            <li>
              El asistente lee y busca en webs de las administraciones públicas. Para abrir otra web
              te pide permiso, y tus datos solo los escribe en webs oficiales.
            </li>
            <li>
              Contraseñas, CAPTCHA, certificados, firmas y pagos los haces tú en la web oficial.
            </li>
          </ul>
        </section>
        <section className="border-t border-border pt-8">
          <Button
            variant="destructive"
            size="lg"
            onClick={() => {
              if (
                confirm(
                  '¿Borrar todo? Se borran tus datos, los trámites, las sesiones del navegador y la clave del proveedor. No se puede deshacer.',
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

export function Bienvenida() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="arrastrar h-[52px]" />
      <div className="mx-auto grid max-w-[1080px] grid-cols-[1fr_440px] gap-16 px-12 pt-10 pb-16">
        <div>
          <Marca size={40} />
          <h1 className="mt-8 mb-0 font-heading text-[52px] leading-[1.06] font-normal tracking-[-0.02em]">
            Tu asistente para hacer trámites
          </h1>
          <p className="mt-5 max-w-[48ch] text-[17px] leading-relaxed text-[var(--text-secondary)]">
            Cuéntale qué necesitas. Investiga en webs oficiales, te explica cada paso con su fuente
            y lo hace contigo en la sede electrónica, mientras lo ves.
          </p>
          <ul className="mt-10 space-y-5 p-0">
            {PROMESAS.map(({ icono, titulo, texto }) => (
              <li key={titulo} className="flex list-none gap-4">
                <Icono nombre={icono} className="mt-0.5 shrink-0 text-brand" />
                <span>
                  <span className="block text-[17px] font-medium">{titulo}</span>
                  <span className="block text-[15px] leading-relaxed text-muted-foreground">
                    {texto}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-12 text-sm text-muted-foreground">
            Proyecto independiente, sin vinculación con la Administración.
          </p>
        </div>
        <div className="rounded-[28px] bg-background p-7 shadow-[var(--shadow-overlay)]">
          <h2 className="mt-0 mb-1 text-xl font-medium">Conecta un proveedor de IA</h2>
          <p className="mt-0 mb-6 text-[15px] leading-relaxed text-muted-foreground">
            Usas tu propia clave: pagas solo lo que uses, normalmente céntimos por trámite. Empiezas
            con el modelo que mejor resultado da en nuestras evaluaciones; puedes cambiarlo en
            Ajustes.
          </p>
          <FormProveedor conModelo={false} />
        </div>
      </div>
    </div>
  );
}
