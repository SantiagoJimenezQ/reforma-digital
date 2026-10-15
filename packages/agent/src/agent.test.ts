// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import {
  aplicarParche,
  compactar,
  ejecutarTurno,
  estadoInicial,
  Fuentes,
  Privacidad,
  tarjetaVacia,
  validarCampo,
  guardaPrivacidad,
  pareceIrreversible,
  type Anfitrion,
  type EstadoAgente,
  type InfoElemento,
  type Navegador,
  type Proveedor,
} from './index';
import { direccionPrivada, htmlATexto, leerPaginaOficial } from './fetch';
import { officialLevel } from '@reforma-digital/government/domains';

const perfil = {
  nombre: 'María José',
  apellido1: 'Núñez',
  documento_numero: '12345678Z',
  telefono: '612345678',
  fecha_nacimiento: '1990-03-07',
  municipio: 'Getafe',
};

describe('privacidad', () => {
  it('sustituye los identificadores guardados en sus variantes y deja el contexto', () => {
    const p = new Privacidad(perfil);
    const texto = p.limpiar(
      'Soy MARIA JOSE NUÑEZ, DNI 12345678-z, móvil +34 612 34 56 78, nací el 7/3/1990 en Getafe',
    );
    expect(texto).toBe(
      'Soy {{nombre}} {{apellido1}}, DNI {{documento_numero}}, móvil {{telefono}}, nací el {{fecha_nacimiento}} en Getafe',
    );
    expect(p.registro).toMatchObject({ nombre: 1, apellido1: 1, documento_numero: 1, telefono: 1 });
  });

  it('reconoce los códigos aunque vayan pegados a otros datos, y la última capa también los nombres', () => {
    const p = new Privacidad(perfil);
    const pegado = '12345678ZMaría José612345678';
    expect(p.limpiar(pegado)).toBe('{{documento_numero}}{{nombre}}{{telefono}}');
    expect(p.contieneDatos('xxNúñezxx')).toBe(true);
    expect(p.limpiar('xxNúñezxx', { laxo: true })).toBe('xx{{apellido1}}xx');
  });

  it('no confunde un nombre con parte de otra palabra', () => {
    const p = new Privacidad({ nombre: 'Ana' });
    expect(p.limpiar('Mañana iré con Ana')).toBe('Mañana iré con {{nombre}}');
  });

  it('solo aplica los detectores genéricos al texto de la persona', () => {
    const p = new Privacidad({});
    const pagina = 'Teléfono de información: 912 345 678';
    expect(p.limpiar(pagina)).toBe(pagina);
    expect(
      p.limpiar('El DNI de mi hijo es 87654321X y su correo hijo@example.com', { usuario: true }),
    ).toBe('El DNI de mi hijo es [DNI] y su correo [correo]');
  });

  it('resuelve marcadores con formato y avisa de los que faltan', () => {
    const p = new Privacidad(perfil);
    expect(
      p.resolver('{{fecha_nacimiento}} {{fecha_nacimiento:dia}} {{documento_numero:letra}}').texto,
    ).toBe('07/03/1990 07 Z');
    expect(p.resolver('{{email}}').faltan).toEqual(['email']);
  });

  it('valida la letra del DNI y del NIE', () => {
    expect(validarCampo('documento_numero', '12345678Z')).toBeNull();
    expect(validarCampo('documento_numero', '12345678A')).toMatch(/letra/);
    expect(validarCampo('documento_numero', 'X1234567L')).toBeNull();
  });
});

describe('tarjeta verificada', () => {
  const fuentes = () => {
    const f = new Fuentes();
    f.añadir(
      'https://www.interior.gob.es/dni/tasas',
      'Tasas del DNI',
      'La tasa por la expedición del DNI es de 12,00 euros. Se paga en la oficina.',
      'pagina',
    );
    return f;
  };

  it('acepta datos con cita literal y rechaza los que no se pueden comprobar', () => {
    const { tarjeta, rechazos } = aplicarParche(
      tarjetaVacia('Renovar el DNI'),
      {
        costes: [
          {
            texto: 'Cuesta 12 euros',
            fuente: 'F1',
            cita: 'La tasa por la expedición del DNI es de 12,00 euros',
          },
          {
            texto: 'Cuesta 15 euros',
            fuente: 'F1',
            cita: 'La tasa por la expedición del DNI es de 12,00 euros',
          },
        ],
        requisitos: [
          {
            texto: 'Llevar una foto',
            fuente: 'F1',
            cita: 'Hay que llevar una fotografía reciente',
          },
          { texto: 'Pago en oficina', fuente: 'F9', cita: 'Se paga en la oficina.' },
        ],
        enlaces: [
          { titulo: 'Cita previa', url: 'https://www.citapreviadnie.es/' },
          { titulo: 'Gestoría', url: 'https://gestoria-rapida.example/dni' },
        ],
      },
      fuentes(),
    );
    expect(tarjeta.costes).toEqual([
      {
        texto: 'Cuesta 12 euros',
        fuente: 'F1',
        cita: 'La tasa por la expedición del DNI es de 12,00 euros',
      },
    ]);
    expect(tarjeta.requisitos).toEqual([]);
    expect(tarjeta.enlaces.map((e) => e.titulo)).toEqual(['Cita previa']);
    expect(rechazos).toHaveLength(4);
    expect(rechazos.join('\n')).toMatch(/cifras/);
    expect(rechazos.join('\n')).toMatch(/F9 no es una fuente/);
  });

  it('solo guarda como fuente páginas de administraciones', () => {
    const f = new Fuentes();
    expect(
      f.añadir('https://www.blog-tramites.example/dni', 'Blog', 'texto', 'busqueda'),
    ).toBeUndefined();
    expect(
      f.añadir('https://sede.agenciatributaria.gob.es/x', 'AEAT', 'texto', 'busqueda')?.id,
    ).toBe('F1');
    expect(officialLevel('https://evilgob.es/')).toBeUndefined();
    expect(officialLevel('http://www.boe.es/')).toBeUndefined();
  });
});

describe('lectura de páginas oficiales', () => {
  it('extrae el contenido principal, los enlaces y las entidades', () => {
    const { titulo, texto } = htmlATexto(
      '<html><head><title>Cita &amp; DNI</title><script>x()</script></head><body><nav>menú</nav><main><h1>Renovaci&oacute;n</h1><p>Necesitas <a href="/foto">una foto</a>.</p><ul><li>DNI anterior</li></ul>' +
        '<p>'.padEnd(500, 'x') +
        '</p></main></body></html>',
      new URL('https://www.interior.gob.es/dni/'),
    );
    expect(titulo).toBe('Cita & DNI');
    expect(texto).toContain('# Renovación');
    expect(texto).toContain('[una foto](https://www.interior.gob.es/foto)');
    expect(texto).toContain('- DNI anterior');
    expect(texto).not.toContain('menú');
  });

  it('no conecta con redes privadas aunque se escriban de otra forma', () => {
    for (const ip of [
      '127.0.0.1',
      '10.1.2.3',
      '192.168.0.1',
      '::1',
      '::ffff:7f00:1',
      '::ffff:127.0.0.1',
      'fd00::1',
      '169.254.169.254',
    ])
      expect(direccionPrivada(ip), ip).toBe(true);
    expect(direccionPrivada('8.8.8.8')).toBe(false);
  });

  it('rechaza webs que no son oficiales sin conectar', async () => {
    await expect(leerPaginaOficial('https://example.com/')).rejects.toThrow(
      /no es una web oficial/,
    );
    await expect(leerPaginaOficial('http://www.boe.es/')).rejects.toThrow(/no es una web oficial/);
  });
});

// --- Agente con un modelo guionado -------------------------------------------------------------

type Prompt = Parameters<MockLanguageModelV4['doStream']>[0]['prompt'];
type Parte =
  Awaited<ReturnType<MockLanguageModelV4['doStream']>>['stream'] extends ReadableStream<infer T>
    ? T
    : never;
type Paso = { texto: string } | { llamadas: { herramienta: string; entrada: unknown }[] };

const uso = {
  inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

/** Cada paso decide qué hace a la vista del prompt; los prompts recibidos quedan registrados. */
function modeloGuionado(pasos: ((prompt: Prompt) => Paso)[]) {
  const prompts: Prompt[] = [];
  let i = 0;
  const model = new MockLanguageModelV4({
    doStream: async ({ prompt }) => {
      prompts.push(prompt);
      const paso = (pasos[Math.min(i++, pasos.length - 1)] ?? (() => ({ texto: 'fin' })))(prompt);
      const chunks: Parte[] =
        'texto' in paso
          ? [
              { type: 'text-start' as const, id: 't' },
              { type: 'text-delta' as const, id: 't', delta: paso.texto },
              { type: 'text-end' as const, id: 't' },
              {
                type: 'finish' as const,
                finishReason: { unified: 'stop' as const, raw: undefined },
                usage: uso,
              },
            ]
          : [
              ...paso.llamadas.map((l, n) => ({
                type: 'tool-call' as const,
                toolCallId: `c${i}-${n}`,
                toolName: l.herramienta,
                input: JSON.stringify(l.entrada),
              })),
              {
                type: 'finish' as const,
                finishReason: { unified: 'tool-calls' as const, raw: undefined },
                usage: uso,
              },
            ];
      return { stream: simulateReadableStream({ chunks }) };
    },
  });
  return { model, prompts };
}

const proveedorDe = (model: MockLanguageModelV4): Proveedor => ({
  tipo: 'openrouter',
  modelo: model,
  rapido: model,
  modeloBusquedaOpenRouter: () => model,
});

type Elemento = Partial<InfoElemento> & { tapado?: boolean };
const ELEMENTOS: Record<number, Elemento> = {
  1: { tag: 'button', rol: 'button', nombre: 'Confirmar cita' },
  2: { tag: 'input', rol: 'textbox', nombre: 'DNI' },
  3: { tag: 'input', rol: 'textbox', nombre: 'Teléfono' },
};

/**
 * Página falsa: por defecto un botón «Confirmar cita» (1), un campo DNI (2) y un teléfono (3).
 * `estado.url` se puede cambiar y `estado.foco` decide qué activaría Intro.
 */
function navegadorFalso(url: string, elementos: Record<number, Elemento> = ELEMENTOS) {
  const escrito: string[] = [];
  const clics: number[] = [];
  const teclas: string[] = [];
  const valores: Record<number, string> = {};
  const estado = { url, foco: 0 };
  let enfocado = 0;
  const pausa = () => new Promise((r) => setTimeout(r, 5));
  const info = (ref: number): InfoElemento | null =>
    elementos[ref]
      ? {
          tag: 'input',
          rol: 'textbox',
          nombre: '',
          href: '',
          contrasena: false,
          desactivado: false,
          marcado: null,
          valor: valores[ref] ?? '',
          paginaConfirmacion: false,
          ...elementos[ref],
        }
      : null;
  const nav: Navegador = {
    url: () => estado.url,
    abrir: async () => {},
    atras: async () => {},
    esperar: async () => {},
    clic: async (x) => {
      clics.push(x);
    },
    insertarTexto: async (t) => {
      await pausa();
      escrito.push(enfocado === 2 ? t : `${enfocado}:${t}`);
      valores[enfocado] = t;
    },
    tecla: async (t) => {
      teclas.push(t);
    },
    evaluar: async <T>(expr: string): Promise<T> => {
      const [, fn, args] = /window\.__rd\.(\w+)\(([^)]*)\)$/.exec(expr) ?? [];
      const ref = Number(args?.split(',')[0]);
      await pausa();
      if (fn === 'enfocar') enfocado = ref;
      const r: Record<string, unknown> = {
        instantanea: {
          url: estado.url,
          titulo: 'Cita',
          texto: Object.entries(elementos)
            .map(
              ([n, e]) =>
                `[${n}] ${e.rol ?? 'textbox'} "${e.nombre}" = "${valores[Number(n)] ?? ''}"`,
            )
            .join('\n'),
          captcha: false,
          contrasenas: 0,
        },
        info: info(ref),
        destinoDeTecla: estado.foco ? info(estado.foco) : null,
        punto: { x: ref * 10, y: 5, tapado: Boolean(elementos[ref]?.tapado), invisible: false },
        enfocar: true,
      };
      return r[fn!] as T;
    },
  };
  return { nav, escrito, clics, teclas, estado, valores };
}

function anfitrion(nav: Navegador, aprobar = true): Anfitrion & { confirmaciones: number } {
  const a = {
    confirmaciones: 0,
    perfil: () => perfil,
    guardarPerfil: async () => {},
    preguntar: async () => ({}),
    confirmar: async () => {
      a.confirmaciones++;
      return aprobar;
    },
    pedirAyuda: async () => ({ hecho: true }),
    navegador: async () => nav,
  };
  return a;
}

const ultimoResultado = (prompt: Prompt) => {
  const tool = [...prompt].reverse().find((m) => m.role === 'tool');
  const part = tool && tool.role === 'tool' ? tool.content.at(-1) : undefined;
  return part && part.type === 'tool-result' && part.output.type === 'text'
    ? part.output.value
    : '';
};

const turno = (
  model: MockLanguageModelV4,
  a: Anfitrion,
  texto: string,
  extra: { estado?: EstadoAgente; limites?: { pasos: number; costeUsd: number } } = {},
  rapido: MockLanguageModelV4 = model,
) =>
  ejecutarTurno({
    proveedor: () => ({ ...proveedorDe(model), rapido }),
    anfitrion: a,
    estado: estadoInicial('Cita'),
    texto,
    evento: () => {},
    signal: new AbortController().signal,
    ...extra,
  });

describe('agente', () => {
  it('nunca envía al modelo los identificadores que escribe la persona', async () => {
    const { model, prompts } = modeloGuionado([() => ({ texto: 'Vale' })]);
    const { nav } = navegadorFalso('https://sede.policia.gob.es/cita');
    const r = await turno(model, anfitrion(nav), 'Mi DNI es 12345678Z y mi móvil 612 345 678');
    expect(r.fin).toBe('respondido');
    const enviado = JSON.stringify(prompts);
    expect(enviado).not.toContain('12345678Z');
    expect(enviado).not.toContain('612 345 678');
    expect(enviado).toContain('{{documento_numero}}');
    expect(enviado).toContain('Getafe');
  });

  it('exige una confirmación aprobada antes de pulsar un botón vinculante', async () => {
    let codigo = '';
    const { model } = modeloGuionado([
      () => ({ llamadas: [{ herramienta: 'pulsar', entrada: { ref: 1 } }] }),
      (p) => {
        expect(ultimoResultado(p)).toMatch(/Antes llama a confirmar/);
        return {
          llamadas: [
            {
              herramienta: 'confirmar',
              entrada: { tipo: 'reservar', accion: 'Reservar la cita', detalles: [] },
            },
          ],
        };
      },
      (p) => {
        codigo = /Código de confirmación: (\w+)/.exec(ultimoResultado(p))?.[1] ?? '';
        return { llamadas: [{ herramienta: 'pulsar', entrada: { ref: 1, confirmacion: codigo } }] };
      },
      (p) => {
        expect(ultimoResultado(p)).toMatch(/Pulsado «Confirmar cita»/);
        return { llamadas: [{ herramienta: 'pulsar', entrada: { ref: 1, confirmacion: codigo } }] };
      },
      (p) => {
        expect(ultimoResultado(p)).toMatch(/Antes llama a confirmar/);
        return { texto: 'Hecho' };
      },
    ]);
    const { nav, clics } = navegadorFalso('https://sede.policia.gob.es/cita');
    const a = anfitrion(nav);
    const r = await turno(model, a, 'Reserva la cita');
    expect(r.fin).toBe('respondido');
    expect(a.confirmaciones).toBe(1);
    expect(clics).toEqual([10]);
  });

  it('escribe datos personales solo en webs oficiales y los devuelve como marcador', async () => {
    const pasos = (esperado: RegExp) =>
      modeloGuionado([
        () => ({
          llamadas: [
            { herramienta: 'escribir', entrada: { ref: 2, texto: '{{documento_numero}}' } },
          ],
        }),
        (p) => {
          expect(ultimoResultado(p)).toMatch(esperado);
          expect(ultimoResultado(p)).not.toContain('12345678Z');
          return { texto: 'ok' };
        },
      ]);
    const oficial = navegadorFalso('https://sede.policia.gob.es/cita');
    await turno(
      pasos(/"DNI" = "\{\{documento_numero\}\}"/).model,
      anfitrion(oficial.nav),
      'Rellena',
    );
    expect(oficial.escrito).toEqual(['12345678Z']);

    const otra = navegadorFalso('https://citas-dni-rapidas.example/form');
    await turno(
      pasos(/no es oficial y la persona no la ha permitido/).model,
      anfitrion(otra.nav),
      'Rellena',
    );
    expect(otra.escrito).toEqual([]);
  });

  it('hace de una en una, en orden, las acciones que el modelo pide a la vez', async () => {
    const { model } = modeloGuionado([
      () => ({
        llamadas: [
          { herramienta: 'escribir', entrada: { ref: 2, texto: '{{documento_numero}}' } },
          { herramienta: 'escribir', entrada: { ref: 3, texto: '{{telefono}}' } },
        ],
      }),
      () => ({ texto: 'ok' }),
    ]);
    const { nav, escrito } = navegadorFalso('https://sede.policia.gob.es/cita');
    await turno(model, anfitrion(nav), 'Rellena');
    expect(escrito).toEqual(['12345678Z', '3:612345678']);
  });

  it('corta las acciones repetidas y respeta el límite de pasos', async () => {
    const repetir = () => ({ llamadas: [{ herramienta: 'ver', entrada: {} }] });
    const vistos: string[] = [];
    const { model } = modeloGuionado([
      repetir,
      repetir,
      repetir,
      (p) => {
        vistos.push(ultimoResultado(p));
        return repetir();
      },
    ]);
    const { nav } = navegadorFalso('https://sede.policia.gob.es/cita');
    const r = await turno(model, anfitrion(nav), 'Mira', { limites: { pasos: 5, costeUsd: 1 } });
    expect(vistos[0]).toMatch(/Ya has hecho exactamente esto dos veces/);
    expect(r.fin).toBe('limite_pasos');
  });

  it('compacta las páginas anteriores y conserva la última', () => {
    const resultado = (id: string, value: string) => ({
      role: 'tool' as const,
      content: [
        {
          type: 'tool-result' as const,
          toolCallId: id,
          toolName: 'ver',
          output: { type: 'text' as const, value },
        },
      ],
    });
    const mensajes = compactar([
      resultado('a', 'Página: A\n---\nmucho texto'),
      resultado('b', 'Página: B\n---\nactual'),
    ]);
    const valores = mensajes.map((m) =>
      m.role === 'tool' && m.content[0]?.type === 'tool-result' ? m.content[0].output : null,
    );
    expect(valores).toEqual([
      { type: 'text', value: 'Página: A\n[página omitida: ya no es la actual]' },
      { type: 'text', value: 'Página: B\n---\nactual' },
    ]);
  });
});

describe('pasos vinculantes', () => {
  const boton = (nombre: string, rol = 'button', paginaConfirmacion = false) =>
    pareceIrreversible({ nombre, rol, paginaConfirmacion });

  it('reconoce envíos, anulaciones y confirmaciones aunque lleven otras palabras', () => {
    for (const n of [
      'Confirmar y ver justificante',
      'Enviar y descargar justificante',
      'Modificar y enviar',
      'Anular cita',
      'Cancelar cita',
      'Firmar y enviar',
    ])
      expect(boton(n), n).toBe(true);
    expect(boton('Enviar', 'menuitem')).toBe(true);
  });

  it('no pide permiso para lo que no compromete, salvo en la pantalla final', () => {
    for (const n of ['Volver', 'Cancelar', 'Solicitar cita', 'Aceptar', 'Ver detalle'])
      expect(boton(n), n).toBe(false);
    expect(boton('Aceptar', 'button', true)).toBe(true);
  });
});

/** Modelo que contesta a la verificación semántica: aprueba todo o falla. */
function verificador(falla = false) {
  return new MockLanguageModelV4({
    doGenerate: async () => {
      if (falla) throw new Error('verificador caído');
      const resultados = Array.from({ length: 10 }, (_, indice) => ({
        indice,
        respaldado: true,
        motivo: '',
      }));
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ resultados }) }],
        finishReason: { unified: 'stop' as const, raw: undefined },
        usage: uso,
        warnings: [],
      };
    },
  });
}

const conFuente = (): EstadoAgente => {
  const f = new Fuentes();
  f.añadir(
    'https://www.interior.gob.es/dni',
    'DNI',
    'La tasa es de 12,00 euros. Hay que llevar una fotografía reciente.',
    'pagina',
  );
  return { ...estadoInicial('Renovar el DNI'), fuentes: f.lista() };
};
const dato = (texto: string, cita: string) => ({ texto, fuente: 'F1', cita });

describe('agente: garantías', () => {
  it('Intro sobre un formulario vinculante también necesita el código', async () => {
    const { model } = modeloGuionado([
      () => ({ llamadas: [{ herramienta: 'tecla', entrada: { tecla: 'Enter' } }] }),
      (p) => {
        expect(ultimoResultado(p)).toMatch(/Antes llama a confirmar/);
        return { texto: 'Pido permiso' };
      },
    ]);
    const f = navegadorFalso('https://sede.policia.gob.es/cita');
    f.estado.foco = 1;
    await turno(model, anfitrion(f.nav), 'Envíalo');
    expect(f.teclas).toEqual([]);
  });

  it('un código solo vale en la web donde se aprobó y se gasta después del clic', async () => {
    let codigo = '';
    const elementos = { ...ELEMENTOS, 1: { ...ELEMENTOS[1], tapado: true } };
    const f = navegadorFalso('https://sede.policia.gob.es/cita', elementos);
    const { model } = modeloGuionado([
      () => ({ llamadas: [{ herramienta: 'ver', entrada: {} }] }),
      () => ({
        llamadas: [
          {
            herramienta: 'confirmar',
            entrada: { tipo: 'reservar', accion: 'Reservar la cita', detalles: [] },
          },
        ],
      }),
      (p) => {
        codigo = /Código de confirmación: (\w+)/.exec(ultimoResultado(p))?.[1] ?? '';
        return { llamadas: [{ herramienta: 'pulsar', entrada: { ref: 1, confirmacion: codigo } }] };
      },
      (p) => {
        // Tapado: no se pulsa y el código sigue valiendo.
        expect(ultimoResultado(p)).toMatch(/tapado/);
        elementos[1].tapado = false;
        f.estado.url = 'https://otra-web.example/pago';
        return { llamadas: [{ herramienta: 'pulsar', entrada: { ref: 1, confirmacion: codigo } }] };
      },
      (p) => {
        expect(ultimoResultado(p)).toMatch(/se aprobó para sede\.policia\.gob\.es/);
        f.estado.url = 'https://sede.policia.gob.es/cita';
        return { llamadas: [{ herramienta: 'pulsar', entrada: { ref: 1, confirmacion: codigo } }] };
      },
      (p) => {
        expect(ultimoResultado(p)).toMatch(/Pulsado «Confirmar cita»/);
        return { texto: 'Hecho' };
      },
    ]);
    await turno(model, anfitrion(f.nav), 'Reserva');
    expect(f.clics).toEqual([10]);
  });

  it('un enlace a una web que no es oficial necesita el permiso de la persona', async () => {
    const elementos = {
      4: { tag: 'a', rol: 'link', nombre: 'Gestoría rápida', href: 'https://gestoria.example/dni' },
    };
    const f = navegadorFalso('https://sede.policia.gob.es/cita', elementos);
    const { model } = modeloGuionado([
      () => ({ llamadas: [{ herramienta: 'pulsar', entrada: { ref: 4 } }] }),
      (p) => {
        expect(ultimoResultado(p)).toMatch(/no es oficial/);
        return { texto: 'Vale' };
      },
    ]);
    const a = anfitrion(f.nav, false);
    await turno(model, a, 'Mira');
    expect(a.confirmaciones).toBe(1);
    expect(f.clics).toEqual([]);
  });

  it('las partes de un dato elegidas con formato vuelven al modelo como marcador', async () => {
    const elementos = { 5: { tag: 'select', rol: 'select', nombre: 'Año de nacimiento' } };
    const f = navegadorFalso('https://sede.policia.gob.es/cita', elementos);
    f.valores[5] = '1990';
    const { model, prompts } = modeloGuionado([
      () => ({ llamadas: [{ herramienta: 'ver', entrada: {} }] }),
      (p) => {
        expect(ultimoResultado(p)).toContain('= "{{fecha_nacimiento:anio}}"');
        return { texto: 'ok' };
      },
    ]);
    await turno(model, anfitrion(f.nav), 'Mira');
    expect(JSON.stringify(prompts)).not.toContain('1990');
    const p = new Privacidad(perfil);
    expect(p.limpiar('DNI 12.345.678-Z y número 12345678')).toBe(
      'DNI {{documento_numero}} y número {{documento_numero}}',
    );
  });

  it('el título que sale del primer mensaje no lleva identificadores al modelo', async () => {
    const { model, prompts } = modeloGuionado([() => ({ texto: 'ok' })]);
    const { nav } = navegadorFalso('https://sede.policia.gob.es/cita');
    await turno(model, anfitrion(nav), 'Hola', {
      estado: estadoInicial('Cita DNI de mi hijo 87654321X, tel 699111222'),
    });
    const enviado = JSON.stringify(prompts);
    expect(enviado).not.toContain('87654321X');
    expect(enviado).not.toContain('699111222');
  });

  it('los identificadores de Mis datos son privados aunque el modelo diga lo contrario', async () => {
    const a = {
      ...anfitrion(navegadorFalso('https://sede.policia.gob.es').nav),
      preguntar: async () => ({ apellido1: 'Ortuzar' }),
    };
    const { model, prompts } = modeloGuionado([
      () => ({
        llamadas: [
          {
            herramienta: 'preguntar',
            entrada: {
              titulo: 'Tus datos',
              campos: [{ clave: 'apellido1', etiqueta: 'Apellido', tipo: 'texto', privado: false }],
            },
          },
        ],
      }),
      () => ({ texto: 'ok' }),
    ]);
    await turno(model, a, 'Pregunta');
    expect(JSON.stringify(prompts)).not.toContain('Ortuzar');
  });

  it('la última capa limpia valores partidos en varias líneas', async () => {
    const p = new Privacidad({ direccion: 'Calle Mayor 1' });
    const guarda = guardaPrivacidad(p);
    const params = {
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'vive en Calle\nMayor 1' }] }],
    };
    const r = (await guarda.transformParams!({
      params,
      type: 'stream',
      model: verificador(),
    } as never)) as typeof params;
    expect(JSON.stringify(r.prompt)).not.toContain('Mayor 1');
  });

  it('dos cambios de la tarjeta a la vez no se pisan, y sin verificador no se publica nada', async () => {
    const llamadas = [
      {
        herramienta: 'actualizar_tramite',
        entrada: {
          requisitos: [dato('Llevar una foto', 'Hay que llevar una fotografía reciente')],
        },
      },
      {
        herramienta: 'actualizar_tramite',
        entrada: { costes: [dato('Cuesta 12 euros', 'La tasa es de 12,00 euros')] },
      },
    ];
    const bien = await turno(
      modeloGuionado([() => ({ llamadas }), () => ({ texto: 'ok' })]).model,
      anfitrion(navegadorFalso('https://x.gob.es').nav),
      'Apunta',
      { estado: conFuente() },
      verificador(),
    );
    expect(bien.estado.tarjeta.requisitos).toHaveLength(1);
    expect(bien.estado.tarjeta.costes).toHaveLength(1);
    const mal = await turno(
      modeloGuionado([() => ({ llamadas }), () => ({ texto: 'ok' })]).model,
      anfitrion(navegadorFalso('https://x.gob.es').nav),
      'Apunta',
      { estado: conFuente() },
      verificador(true),
    );
    expect(mal.estado.tarjeta.requisitos).toHaveLength(0);
    expect(mal.estado.tarjeta.costes).toHaveLength(0);
  });
});
