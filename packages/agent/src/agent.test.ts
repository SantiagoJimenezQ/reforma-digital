// @vitest-environment node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { APICallError, RetryError, simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import {
  compactar,
  crearDetector,
  datosPorReglas,
  ejecutarTurno,
  ErrorDeProteccion,
  estadoInicial,
  mensajeDeError,
  Fuentes,
  pendientes,
  perfilParaModelo,
  Privacidad,
  unir,
  validarCampo,
  guardaPrivacidad,
  pareceIrreversible,
  type Anfitrion,
  type Detector,
  type EstadoAgente,
  type InfoElemento,
  type Navegador,
  type Proveedor,
  type TipoDato,
} from './index';
import { direccionPrivada, htmlATexto, leerPagina } from './fetch';
import { isOfficial } from '@reforma-digital/government/domains';

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

  it('reconoce los códigos aunque vayan pegados a otros datos, sin tocar nombres dentro de palabras', () => {
    const p = new Privacidad(perfil);
    const pegado = '12345678ZMaría José612345678';
    expect(p.limpiar(pegado)).toBe('{{documento_numero}}{{nombre}}{{telefono}}');
    expect(p.limpiar('ref9912345678Z00', { laxo: true })).toBe('ref99{{documento_numero}}00');
    const lucia = new Privacidad({ nombre: 'Lucía' });
    expect(lucia.limpiar('Junta de Andalucía · Lucía', { laxo: true })).toBe(
      'Junta de Andalucía · {{nombre}}',
    );
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

  it('valida la letra del DNI y del NIE y el control del IBAN', () => {
    expect(validarCampo('documento_numero', '12345678Z')).toBeNull();
    expect(validarCampo('documento_numero', '12345678A')).toMatch(/letra/);
    expect(validarCampo('documento_numero', 'X1234567L')).toBeNull();
    expect(validarCampo('iban', 'ES91 2100 0418 4502 0005 1332')).toBeNull();
    expect(validarCampo('iban', 'ES00 0000 0000 0000 0000 0000')).toMatch(/IBAN/);
  });
});

describe('fuentes', () => {
  it('marca como no oficiales las webs que no están en la lista', () => {
    const f = new Fuentes();
    expect(f.añadir('http://www.ayto-villacanada.es/padron', 'Padrón', 'busqueda')).toBe(undefined);
    expect(f.añadir('https://www.ayto-villacanada.es/padron', 'Padrón', 'busqueda')?.oficial).toBe(
      false,
    );
    expect(f.añadir('https://sede.agenciatributaria.gob.es/x', 'AEAT', 'busqueda')?.oficial).toBe(
      true,
    );
    expect(isOfficial('https://evilgob.es/')).toBe(false);
    expect(isOfficial('http://www.boe.es/')).toBe(false);
  });
});

describe('errores del proveedor', () => {
  it('reconoce el límite de peticiones después de los reintentos', () => {
    const limite = new APICallError({
      message: 'Rate limit exceeded',
      url: 'https://api.nan.builders/v1/chat/completions',
      requestBodyValues: {},
      statusCode: 429,
    });
    const e = new RetryError({
      message: 'Failed after 3 attempts',
      reason: 'maxRetriesExceeded',
      errors: [limite],
    });
    expect(mensajeDeError(e)).toMatch(/limitando las peticiones/);
  });
});

describe('lectura de páginas', () => {
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

  it('no lee una IP privada escrita en la URL', async () => {
    for (const url of ['https://127.0.0.1:9/', 'https://[::1]:9/', 'https://169.254.169.254/'])
      await expect(leerPagina(url), url).rejects.toThrow(/red privada/);
  });

  it('rechaza lo que no es https sin conectar', async () => {
    await expect(leerPagina('http://www.boe.es/')).rejects.toThrow(/no usa https/);
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
  const elecciones: unknown[] = [];
  let i = 0;
  const model = new MockLanguageModelV4({
    doStream: async ({ prompt, toolChoice }) => {
      prompts.push(prompt);
      elecciones.push(toolChoice);
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
  return { model, prompts, elecciones };
}

const proveedorDe = (model: MockLanguageModelV4): Proveedor => ({
  tipo: 'nan',
  modelo: model,
  claveExa: '',
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
  // Como el script real: los valores de los campos de texto van aparte.
  const instantanea = () => {
    const vistos: string[] = [];
    const texto = Object.entries(elementos)
      .map(([n, e]) => {
        const v = valores[Number(n)] ?? '';
        const rol = e.rol ?? 'textbox';
        if (rol === 'textbox' && v) vistos.push(v);
        return `[${n}] ${rol} "${e.nombre}" = "${rol === 'textbox' && v ? `⟦${vistos.length - 1}⟧` : v}"`;
      })
      .join('\n');
    return {
      url: estado.url,
      titulo: 'Cita',
      texto,
      valores: vistos,
      captcha: false,
      contrasenas: 0,
    };
  };
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
        instantanea: instantanea(),
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

/** Las reglas reales y, en lugar del modelo de Rampart, una lista de nombres. */
const NOMBRES: Record<string, TipoDato> = { Iker: 'nombre', Arrieta: 'apellido' };
const detectorDePrueba: Detector = async (t) =>
  unir([
    ...datosPorReglas(t),
    ...Object.entries(NOMBRES).flatMap(([n, tipo]) =>
      [...t.matchAll(new RegExp(n, 'g'))].map((m) => ({
        inicio: m.index,
        fin: m.index + n.length,
        tipo,
      })),
    ),
  ]);

const turno = (
  model: MockLanguageModelV4,
  a: Anfitrion,
  texto: string,
  extra: {
    estado?: EstadoAgente;
    limites?: { pasos: number; costeUsd: number };
    detector?: Detector;
    signal?: AbortSignal;
  } = {},
) =>
  ejecutarTurno({
    proveedor: () => proveedorDe(model),
    anfitrion: a,
    estado: estadoInicial('Cita'),
    texto,
    evento: () => {},
    signal: new AbortController().signal,
    detector: detectorDePrueba,
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

  it('escribe datos personales en cualquier web y los devuelve como marcador', async () => {
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

    const otra = navegadorFalso('https://citas.clinica-ejemplo.es/form');
    await turno(pasos(/"DNI" = "\{\{documento_numero\}\}"/).model, anfitrion(otra.nav), 'Rellena');
    expect(otra.escrito).toEqual(['12345678Z']);
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

  it('sigue enlaces a webs que no son oficiales sin pedir permiso', async () => {
    const elementos = {
      4: { tag: 'a', rol: 'link', nombre: 'Pedir cita', href: 'https://citas.clinica-ejemplo.es/' },
    };
    const f = navegadorFalso('https://sede.policia.gob.es/cita', elementos);
    const { model } = modeloGuionado([
      () => ({ llamadas: [{ herramienta: 'pulsar', entrada: { ref: 4 } }] }),
      () => ({ texto: 'Vale' }),
    ]);
    const a = anfitrion(f.nav, false);
    await turno(model, a, 'Mira');
    expect(a.confirmaciones).toBe(0);
    expect(f.clics).toEqual([40]);
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

  it('el título sale del primer mensaje, sin datos personales', async () => {
    const { model } = modeloGuionado([() => ({ texto: 'ok' })]);
    const { nav } = navegadorFalso('https://sede.policia.gob.es/cita');
    const r = await turno(model, anfitrion(nav), 'Cita DNI de mi hijo 87654321X, tel 699111222', {
      estado: estadoInicial(),
    });
    expect(r.estado.titulo).toBe('Cita DNI de mi hijo {{documento_1}}, tel {{telefono_1}}');
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
      model: new MockLanguageModelV4(),
    } as never)) as typeof params;
    expect(JSON.stringify(r.prompt)).not.toContain('Mayor 1');
  });
});

describe('datos que no están en Mis datos', () => {
  it('las reglas encuentran documentos, contactos, direcciones y fechas de nacimiento', () => {
    const t =
      'Mi hijo nació el 3/5/2015, DNI 87654321X, vive en Calle Mayor 12, 3ºB y en Avda. de la Constitución 45. Correo hijo@example.com, móvil 699 111 222, IBAN ES91 2100 0418 4502 0005 1332.';
    const vistos = datosPorReglas(t).map((d) => t.slice(d.inicio, d.fin));
    expect(vistos).toEqual([
      '3/5/2015',
      '87654321X',
      'Calle Mayor 12, 3ºB',
      'Avda. de la Constitución 45',
      'hijo@example.com',
      '699 111 222',
      'ES91 2100 0418 4502 0005 1332',
    ]);
    const tramite =
      'Requisitos: ser mayor de 18 años y pagar 12,00 euros. Horario de 9:00 a 14:00. Cita el 9 de noviembre de 2026.';
    expect(datosPorReglas(tramite)).toEqual([]);
  });

  it('lo que la persona escribe de otra persona llega como marcador y se escribe en la web oficial', async () => {
    const { model, prompts } = modeloGuionado([
      () => ({
        llamadas: [
          { herramienta: 'escribir', entrada: { ref: 2, texto: '{{documento_1}}' } },
          { herramienta: 'escribir', entrada: { ref: 3, texto: '{{nombre_1}} {{apellido_1}}' } },
        ],
      }),
      () => ({ texto: 'ok' }),
    ]);
    const { nav, escrito } = navegadorFalso('https://sede.policia.gob.es/cita');
    const r = await turno(model, anfitrion(nav), 'Cita para mi hijo Iker Arrieta, DNI 87654321X');
    const enviado = JSON.stringify(prompts);
    for (const v of ['Iker', 'Arrieta', '87654321X']) expect(enviado).not.toContain(v);
    expect(enviado).toContain('mi hijo {{nombre_1}} {{apellido_1}}, DNI {{documento_1}}');
    expect(escrito).toEqual(['87654321X', '3:Iker Arrieta']);
    expect(r.estado.datosTramite).toMatchObject({ nombre_1: 'Iker', documento_1: '87654321X' });
  });

  it('de un campo solo ve lo que ha escrito el agente; lo que traía la web queda oculto', async () => {
    const elementos = {
      2: { tag: 'input', rol: 'textbox', nombre: 'Titular' },
      3: { tag: 'input', rol: 'textbox', nombre: 'Motivo' },
      4: { tag: 'input', rol: 'textbox', nombre: 'País' },
      5: { tag: 'a', rol: 'link', nombre: 'Gobierno de España' },
    };
    const f = navegadorFalso('https://sede.policia.gob.es/carpeta', elementos);
    f.valores[2] = 'Maite Goñi';
    f.valores[4] = 'España';
    const { model, prompts } = modeloGuionado([
      () => ({ llamadas: [{ herramienta: 'escribir', entrada: { ref: 3, texto: 'Matrícula' } }] }),
      (p) => {
        expect(ultimoResultado(p)).toContain('"Titular" = "{{dato_1}}"');
        expect(ultimoResultado(p)).toContain('"Motivo" = "Matrícula"');
        // Lo que traía un campo se oculta solo ahí: el resto de la página sigue igual.
        expect(ultimoResultado(p)).toContain('"País" = "{{dato_2}}"');
        expect(ultimoResultado(p)).toContain('"Gobierno de España"');
        return { texto: 'ok' };
      },
    ]);
    await turno(model, anfitrion(f.nav), 'Rellena el motivo');
    expect(JSON.stringify(prompts)).not.toContain('Goñi');
  });

  it('si el detector falla, el turno se para sin enviar lo que no ha podido proteger', async () => {
    const falla: Detector = async () => {
      throw new ErrorDeProteccion('No se han podido proteger los datos personales');
    };
    const antes = modeloGuionado([() => ({ texto: 'no debería llegar' })]);
    const r = await turno(antes.model, anfitrion(navegadorFalso('https://x.gob.es').nav), 'Hola', {
      detector: falla,
    });
    expect(r.fin).toBe('error');
    expect(r.error).toMatch(/No se ha enviado nada al asistente/);
    expect(antes.prompts).toHaveLength(0);

    // A mitad del turno: la página que no se ha podido proteger no llega al modelo.
    let llamadas = 0;
    const aMitad: Detector = async (t, origen) => {
      if (++llamadas > 1)
        throw new ErrorDeProteccion('No se han podido proteger los datos personales');
      return detectorDePrueba(t, origen);
    };
    const f = navegadorFalso('https://sede.policia.gob.es/cita');
    f.valores[3] = 'Maite Goñi';
    const durante = modeloGuionado([
      () => ({ llamadas: [{ herramienta: 'ver', entrada: {} }] }),
      () => ({ texto: 'no debería llegar' }),
    ]);
    const r2 = await turno(durante.model, anfitrion(f.nav), 'Mira', { detector: aMitad });
    expect(r2.fin).toBe('error');
    expect(durante.prompts).toHaveLength(1);
  });

  it('el modelo solo lee las respuestas que necesita para razonar', async () => {
    const a = {
      ...anfitrion(navegadorFalso('https://sede.policia.gob.es').nav),
      preguntar: async () => ({
        nombre_hijo: 'Iker',
        nacimiento_hijo: '2015-05-03',
        tiene_cita: 'Sí',
      }),
    };
    const { model, prompts } = modeloGuionado([
      () => ({
        llamadas: [
          {
            herramienta: 'preguntar',
            entrada: {
              titulo: 'Datos de tu hijo',
              campos: [
                { clave: 'nombre_hijo', etiqueta: 'Nombre', tipo: 'texto', privado: false },
                { clave: 'nacimiento_hijo', etiqueta: 'Nacimiento', tipo: 'fecha', privado: false },
                { clave: 'tiene_cita', etiqueta: '¿Tiene cita?', tipo: 'si_no', privado: false },
              ],
            },
          },
        ],
      }),
      () => ({ texto: 'ok' }),
    ]);
    await turno(model, a, 'Pregunta');
    const enviado = JSON.stringify(prompts);
    expect(enviado).not.toContain('Iker');
    expect(enviado).not.toContain('2015');
    expect(enviado).toContain('tiene_cita: Sí');
  });

  it('la última capa oculta cualquier DNI, NIE o IBAN válido, venga de donde venga', () => {
    const p = new Privacidad({});
    expect(
      p.limpiar('DNI 87654321X, NIE X1234567L, IBAN ES91 2100 0418 4502 0005 1332, ref 12345678A', {
        laxo: true,
      }),
    ).toBe('DNI [DNI], NIE [NIE], IBAN [IBAN], ref 12345678A');
  });

  it('el código postal y la caducidad del documento no llegan al modelo', () => {
    const texto = perfilParaModelo(
      { codigo_postal: '28009', documento_caducidad: '2027-03-01', municipio: 'Madrid' },
      new Date('2026-10-16'),
    );
    expect(texto).not.toContain('28009');
    expect(texto).not.toContain('2027');
    expect(texto).toContain('caduca en 4 meses');
    expect(texto).toContain('Madrid');
  });
});

describe('formularios', () => {
  it.each([
    'Puedo pedirte la cita. Dime esto en el formulario:',
    'Si quieres, te acompaño paso a paso en la web oficial.',
  ])(
    'si ofrece hacerlo y no pone el formulario, tiene un paso más en el que solo puede ponerlo: «%s»',
    async (oferta) => {
      const pedido: string[] = [];
      const a = {
        ...anfitrion(navegadorFalso('https://sede.policia.gob.es').nav),
        preguntar: async (f: { accion?: string }) => {
          pedido.push(f.accion ?? '');
          return {};
        },
      };
      const { model, elecciones } = modeloGuionado([
        () => ({ texto: oferta }),
        () => ({
          llamadas: [
            {
              herramienta: 'preguntar',
              entrada: {
                titulo: 'Tu cita',
                accion: 'Pedir la cita',
                campos: [{ clave: 'documento_soporte', etiqueta: 'Soporte', tipo: 'texto' }],
              },
            },
          ],
        }),
        () => ({ texto: 'Gracias, voy a por ella.' }),
      ]);
      const r = await turno(model, a, 'Renueva mi DNI');
      expect(r.fin).toBe('respondido');
      expect(elecciones[1]).toEqual({ type: 'tool', toolName: 'preguntar' });
      expect(pedido).toEqual(['Pedir la cita']);
    },
  );

  it('espera lo que haga falta a que la persona rellene el formulario', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const a = {
        ...anfitrion(navegadorFalso('https://sede.policia.gob.es').nav),
        preguntar: async () => {
          await vi.advanceTimersByTimeAsync(5 * 60_000);
          return {};
        },
      };
      const { model } = modeloGuionado([
        () => ({
          llamadas: [
            {
              herramienta: 'preguntar',
              entrada: {
                titulo: 'Tu cita',
                campos: [{ clave: 'documento_soporte', etiqueta: 'Soporte', tipo: 'texto' }],
              },
            },
          ],
        }),
        () => ({ texto: 'Gracias, voy a por ella.' }),
      ]);
      expect((await turno(model, a, 'Renueva mi DNI')).fin).toBe('respondido');
    } finally {
      vi.useRealTimers();
    }
  });

  it('lo que la persona escribe mientras trabaja entra antes del siguiente paso', async () => {
    // Llega mientras el asistente mira Mis datos.
    let pasos = 0;
    const { model, prompts } = modeloGuionado([
      () => ({ llamadas: [{ herramienta: 'mis_datos', entrada: {} }] }),
      () => ({ texto: 'Vale, en Plasencia.' }),
    ]);
    const r = await ejecutarTurno({
      proveedor: () => proveedorDe(model),
      anfitrion: anfitrion(navegadorFalso('https://sede.policia.gob.es').nav),
      estado: estadoInicial('Cita'),
      texto: 'Pide mi cita',
      entrantes: () => (pasos++ === 1 ? ['Mejor en Plasencia'] : []),
      evento: () => {},
      signal: new AbortController().signal,
      detector: detectorDePrueba,
    });
    expect(r.fin).toBe('respondido');
    expect(prompts[1]!.at(-1)).toMatchObject({ role: 'user' });
    expect(JSON.stringify(prompts[1]!.at(-1))).toContain('Mejor en Plasencia');
  });

  it('si se corta mientras espera a la persona, un turno sin texto vuelve a hacer la misma pregunta', async () => {
    const { nav } = navegadorFalso('https://sede.policia.gob.es');
    const control = new AbortController();
    const cortado = await turno(
      modeloGuionado([
        () => ({
          llamadas: [
            {
              herramienta: 'preguntar',
              entrada: {
                titulo: 'Tu cita',
                campos: [{ clave: 'oficina', etiqueta: 'Oficina', tipo: 'texto' }],
              },
            },
          ],
        }),
      ]).model,
      {
        ...anfitrion(nav),
        preguntar: (_f, signal) => {
          control.abort(new Error('La app se cierra'));
          return Promise.reject(signal.reason);
        },
      },
      'Pide mi cita',
      { signal: control.signal },
    );
    expect(cortado.fin).toBe('cancelado');
    expect(pendientes(cortado.estado.mensajes).map((l) => l.toolName)).toEqual(['preguntar']);

    const preguntas: string[] = [];
    const { model, prompts } = modeloGuionado([() => ({ texto: 'Voy a por ella.' })]);
    const retomado = await ejecutarTurno({
      proveedor: () => proveedorDe(model),
      anfitrion: {
        ...anfitrion(nav),
        preguntar: async (f) => {
          preguntas.push(f.titulo);
          return { oficina: 'Norte' };
        },
      },
      estado: cortado.estado,
      evento: () => {},
      signal: new AbortController().signal,
      detector: detectorDePrueba,
    });
    expect(retomado.fin).toBe('respondido');
    expect(preguntas).toEqual(['Tu cita']);
    expect(ultimoResultado(prompts[0]!)).toMatch(/^Respuestas:\n- oficina:/);
    expect(prompts[0]!.filter((m) => m.role === 'user')).toHaveLength(1);

    // Si en vez de responder escribe otra cosa, la pregunta se queda sin respuesta.
    const otro = modeloGuionado([() => ({ texto: 'Vale' })]);
    await turno(otro.model, anfitrion(nav), 'Mejor otro día', { estado: cortado.estado });
    expect(JSON.stringify(otro.prompts[0])).toContain('detuvo al asistente sin responder');
  });
});

describe('marcadores y formatos', () => {
  it('un valor guardado no toca los marcadores que ya hay', () => {
    const p = new Privacidad({ medio_contacto: 'Correo' });
    expect(p.limpiar('Escribe a {{correo_1}} por correo')).toBe(
      'Escribe a {{correo_1}} por {{medio_contacto}}',
    );
  });

  it('lo guardado conserva su marcador en otro formato y no se mezcla con lo detectado', async () => {
    const p = new Privacidad(perfil);
    const datos = {};
    const iker: Detector = async (t) => [
      { inicio: t.indexOf('Iker'), fin: t.indexOf('Núñez') + 5, tipo: 'nombre' },
    ];
    expect(
      await p.proteger('Llama al +34 612 345 678 por Iker Núñez', iker, datos, 'persona'),
    ).toBe('Llama al {{telefono}} por {{nombre_1}} {{apellido1}}');
    expect(datos).toEqual({ nombre_1: 'Iker' });
  });

  it('lo que trae un campo sigue oculto aunque el agente lo copie a otro', async () => {
    const elementos = {
      2: { tag: 'input', rol: 'textbox', nombre: 'Titular' },
      3: { tag: 'input', rol: 'textbox', nombre: 'Representante' },
      4: { tag: 'input', rol: 'textbox', nombre: 'Hija' },
    };
    const f = navegadorFalso('https://sede.policia.gob.es/carpeta', elementos);
    f.valores[2] = 'Maite Goñi';
    f.valores[4] = 'Maya';
    const { model, prompts } = modeloGuionado([
      () => ({ llamadas: [{ herramienta: 'ver', entrada: {} }] }),
      () => ({ llamadas: [{ herramienta: 'escribir', entrada: { ref: 3, texto: '{{dato_1}}' } }] }),
      (p) => {
        expect(ultimoResultado(p)).toContain('"Representante" = "{{dato_1}}"');
        return { texto: 'ok' };
      },
    ]);
    await turno(model, anfitrion(f.nav), 'Copia el titular');
    expect(f.escrito).toEqual(['3:Maite Goñi']);
    for (const v of ['Goñi', 'Maya']) expect(JSON.stringify(prompts)).not.toContain(v);
  });

  it('un número largo y las claves de datos encontrados no se dejan leer ni pisar', async () => {
    const a = {
      ...anfitrion(navegadorFalso('https://sede.policia.gob.es').nav),
      preguntar: async () => ({ personas: '3', nuss: '281234567840' }),
    };
    const numero = (clave: string) => ({ clave, etiqueta: clave, tipo: 'numero', privado: false });
    const { model, prompts } = modeloGuionado([
      () => ({
        llamadas: [
          {
            herramienta: 'preguntar',
            entrada: { titulo: 'Datos', campos: [{ ...numero('nombre_1'), tipo: 'texto' }] },
          },
        ],
      }),
      (p) => {
        expect(ultimoResultado(p)).toMatch(/es de un dato ya encontrado/);
        return {
          llamadas: [
            {
              herramienta: 'preguntar',
              entrada: { titulo: 'Datos', campos: [numero('personas'), numero('nuss')] },
            },
          ],
        };
      },
      () => ({ texto: 'ok' }),
    ]);
    await turno(model, a, 'Pregunta');
    const enviado = JSON.stringify(prompts);
    expect(enviado).toContain('personas: 3');
    expect(enviado).not.toContain('281234567840');
  });
});

const modelo = path.resolve(import.meta.dirname, '../.cache/rampart');
// Con el modelo de verdad (pnpm --filter @reforma-digital/agent detector): sin él, no se ejecuta.
describe.skipIf(!existsSync(modelo))('detector con el modelo de Rampart', () => {
  it('oculta nombres enteros sin partir palabras ni tapar trámites, oficinas o municipios', async () => {
    const d = await crearDetector(modelo);
    const proteger = (t: string, origen: 'persona' | 'pagina') =>
      new Privacidad({}).proteger(t, d, {}, origen);
    const familia = await proteger(
      'Cita para mi hijo Iker Arrieta y para mi madre Carmen López',
      'persona',
    );
    for (const v of ['Iker', 'Arrieta', 'Carmen', 'López']) expect(familia).not.toContain(v);
    expect(familia).not.toMatch(/\p{L}\{\{|\}\}\p{L}/u);
    for (const t of [
      'Rellena el Modelo 030 de Hacienda para el empadronamiento de Getafe',
      'Tengo que pagar la tasa 790 código 012. Solicitar la ayuda por nacimiento de hijo',
    ])
      expect(await proteger(t, 'persona')).toBe(t);
    expect(await proteger('Elija la oficina. Bienvenida, LUCÍA ORTUZAR', 'pagina')).toBe(
      'Elija la oficina. Bienvenida, {{dato_1}}',
    );
    const sede = 'Oficina: Villaejemplo Norte · Trámite: Alta en el padrón';
    expect(await proteger(sede, 'pagina')).toBe(sede);
  }, 60_000);
});
