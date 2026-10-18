import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  net,
  protocol,
  session,
  shell,
  systemPreferences,
  type MenuItemConstructorOptions,
} from 'electron';
import { z } from 'zod';
import {
  camposPerfil,
  esIdentificador,
  mensajeDeError,
  normalizarCampo,
  crearDetector,
  probarConexion,
  validarCampo,
  type ConfigProveedor,
  type Detector,
  type Perfil,
} from '@reforma-digital/agent';
import type { Ajustes, ApiRd, EstadoApp, EventoApp } from '../shared/api';
import { officialLevel } from '@reforma-digital/government/domains';
import { Almacen } from './almacen';
import { esLectura } from './navegador';
import { Tramites } from './tramites';

const RAIZ = import.meta.dirname;
/** Fuera del ASAR: Chromium no carga extensiones ni ONNX Runtime lee modelos desde un archivo empaquetado. */
const DESEMPAQUETADO = RAIZ.replace(/app\.asar(?=[/\\]|$)/, 'app.asar.unpacked');
const ORIGEN_APP = 'app://bundle';
app.setName('Reforma Digital');
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);
if (!app.requestSingleInstanceLock()) app.quit();

/**
 * La clave de Vercel AI Gateway con la que la app llama al asistente, para que nadie tenga que
 * traer la suya. Se pone al compilar (AI_GATEWAY_API_KEY): va dentro de la app y se puede sacar
 * de ella, así que solo vale para compilaciones propias, no para repartir.
 */
const CLAVE_GATEWAY = process.env.CLAVE_GATEWAY ?? '';
/**
 * Temporal: si se compila con NAN_API_KEY y EXA_API_KEY, el asistente usa un modelo abierto de
 * NaN Builders (sin registro de peticiones, en la UE) y busca con Exa, en lugar de Vercel AI Gateway.
 */
const NAN =
  process.env.CLAVE_NAN && process.env.CLAVE_EXA
    ? { clave: process.env.CLAVE_NAN, claveExa: process.env.CLAVE_EXA, modelo: 'deepseek-v4-flash' }
    : null;

/** El proveedor con el que habla el asistente, o `null` si la compilación no lleva claves. */
function configProveedor(modelo: string, retencionCero: boolean): ConfigProveedor | null {
  if (NAN) return { tipo: 'nan', ...NAN };
  return CLAVE_GATEWAY ? { tipo: 'gateway', clave: CLAVE_GATEWAY, modelo, retencionCero } : null;
}

type Secretos = { ajustes: Ajustes };
const AJUSTES_INICIALES: Ajustes = {
  modelo: 'openai/gpt-6-luna',
  touchIdEnConfirmaciones: true,
  interfacesComunitarias: false,
  retencionCero: false,
  cerrarSesiones: false,
};

let ventana: BrowserWindow | null = null;
let almacen: Almacen;
let tramites: Tramites;
let secretos: Secretos = { ajustes: AJUSTES_INICIALES };
let perfil: Perfil = {};
let detector: Promise<Detector> | undefined;
const SIN_CLAVE =
  'Esta compilación de la app no lleva la clave del asistente. Compílala con AI_GATEWAY_API_KEY.';
/** Se carga una vez, del modelo que va dentro de la app; si falla, se reintenta en el siguiente turno. */
const cargarDetector = () =>
  (detector ??= crearDetector(path.join(DESEMPAQUETADO, 'modelos/rampart')).catch((e: unknown) => {
    detector = undefined;
    throw e;
  }));

const touchId = () => process.platform === 'darwin' && systemPreferences.canPromptTouchID();
async function verificar(motivo: string, exigir: boolean) {
  if (!exigir || !touchId()) return true;
  return systemPreferences.promptTouchID(motivo).then(
    () => true,
    () => false,
  );
}

/** Vista del perfil sin identificadores: solo «guardado» y una pista mínima. */
function perfilVista() {
  return camposPerfil.map((c) => {
    const v = perfil[c.clave];
    const vista = !v
      ? ''
      : esIdentificador(c.clave)
        ? v.length > 6
          ? `•••• ${v.slice(-3)}`
          : '••••'
        : v;
    return { clave: c.clave, guardado: Boolean(v), vista };
  });
}

function recordatorios(): EstadoApp['recordatorios'] {
  const caduca = perfil.documento_caducidad;
  if (!caduca || caduca.startsWith('9999')) return [];
  const dias = Math.round((Date.parse(caduca) - Date.now()) / 86400000);
  if (!Number.isFinite(dias) || dias > 120) return [];
  const doc = perfil.documento_tipo || 'documento';
  const fecha = caduca.split('-').reverse().join('/');
  return [
    {
      texto: dias < 0 ? `Tu ${doc} caducó el ${fecha}.` : `Tu ${doc} caduca el ${fecha}.`,
      sugerencia:
        doc === 'NIE'
          ? 'Quiero renovar mi tarjeta de residencia (TIE)'
          : `Quiero renovar mi ${doc}`,
    },
  ];
}

function estadoApp(): EstadoApp {
  return {
    version: app.getVersion(),
    ajustes: secretos.ajustes,
    modeloNan: NAN?.modelo ?? null,
    tramites: tramites.lista(),
    campos: camposPerfil,
    perfil: perfilVista(),
    touchId: touchId(),
    desarrollo: !app.isPackaged,
    recordatorios: recordatorios(),
  };
}

function emitir(e: EventoApp) {
  ventana?.webContents.send('rd:evento', e);
}

const ajustesEsquema = z
  .object({
    modelo: z
      .string()
      .regex(/^[\w.-]+\/[\w.:-]+$/)
      .max(100),
    touchIdEnConfirmaciones: z.boolean(),
    interfacesComunitarias: z.boolean(),
    retencionCero: z.boolean(),
    cerrarSesiones: z.boolean(),
  })
  .partial();
const texto = z.string().trim().min(1).max(4000);
const razonamiento = z.enum(['low', 'medium', 'high']);
const id = z.string().uuid();
const rect = z
  .object({ x: z.number(), y: z.number(), width: z.number().min(0), height: z.number().min(0) })
  .nullable();

/** Cada método de `window.rd`, con su validación de entrada. */
const metodos: { [K in Exclude<keyof ApiRd, 'on'>]: (...args: unknown[]) => ReturnType<ApiRd[K]> } =
  {
    estado: async () => estadoApp(),
    guardarAjustes: async (entrada) => {
      const a = ajustesEsquema.safeParse(entrada);
      if (!a.success) return { ok: false, error: 'Revisa los ajustes.' };
      secretos = { ajustes: { ...secretos.ajustes, ...a.data } };
      await almacen.escribir('secretos.bin', secretos);
      if (a.data.interfacesComunitarias !== undefined) await tramites.aplicarExtension();
      emitir({ tipo: 'estado', estado: estadoApp() });
      return { ok: true };
    },
    probarConexion: async (entrada) => {
      const a = z
        .object({ modelo: z.string().max(100), retencionCero: z.boolean().optional() })
        .parse(entrada);
      const cfg = configProveedor(a.modelo, a.retencionCero ?? secretos.ajustes.retencionCero);
      if (!cfg) return { ok: false, error: SIN_CLAVE };
      try {
        await probarConexion(cfg);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: mensajeDeError(e) };
      }
    },
    crearTramite: async (t, r) => tramites.crear(texto.parse(t), razonamiento.parse(r)),
    ajustarTramite: async (t, c) =>
      tramites.ajustar(
        id.parse(t),
        z.object({ fijado: z.boolean(), razonamiento }).partial().strict().parse(c),
      ),
    verTramite: async (t) => tramites.vista(id.parse(t)),
    enviar: async (t, m) => tramites.enviar(id.parse(t), texto.parse(m)),
    quitarDeCola: async (t, m) => tramites.quitarDeCola(id.parse(t), id.parse(m)),
    redirigir: async (t, m) => tramites.redirigir(id.parse(t), id.parse(m)),
    volver: async (t, m) => tramites.volver(id.parse(t), id.parse(m)),
    detener: async (t) => tramites.detener(id.parse(t)),
    borrarTramite: async (t) => {
      await tramites.borrar(id.parse(t));
    },
    responder: async (t, p, r) =>
      tramites.responder(
        id.parse(t),
        id.parse(p),
        z
          .union([z.record(z.string().max(60), z.string().max(2000)), z.boolean(), z.null()])
          .parse(r),
      ),
    colocarNavegador: async (t, r) => tramites.colocarNavegador(id.parse(t), rect.parse(r)),
    navegar: async (t, accion) => {
      const nav = tramites.navegador(id.parse(t));
      if (z.enum(['atras', 'recargar']).parse(accion) === 'atras') await nav.atras();
      else nav.webContents.reload();
    },
    abrirEnTramite: async (t, u) => {
      const url = z
        .string()
        .url()
        .refine((u) => u.startsWith('https://'))
        .parse(u);
      await tramites.navegador(id.parse(t)).abrir(url);
    },
    revelarPerfil: async () =>
      (await verificar('mostrar tus datos', true)) ? { ...perfil } : null,
    guardarPerfil: async (entrada) => {
      const valores = z
        .record(z.string().regex(/^[a-z0-9_]{2,40}$/), z.string().max(300))
        .parse(entrada);
      const errores: Record<string, string> = {};
      const nuevo = { ...perfil };
      for (const [clave, bruto] of Object.entries(valores)) {
        if (!bruto.trim()) {
          delete nuevo[clave];
          continue;
        }
        const valor = normalizarCampo(clave, bruto);
        const error = validarCampo(clave, valor);
        if (error) errores[clave] = error;
        else nuevo[clave] = valor;
      }
      if (!Object.keys(errores).length) await guardarPerfil(nuevo);
      return errores;
    },
    borrarDatos: async (que) => {
      if (z.enum(['perfil', 'todo']).parse(que) === 'perfil') await guardarPerfil({});
      else {
        tramites.detenerTodo();
        await tramites.borrarTodo();
        await almacen.destruir();
        // Lo que guarda la interfaz: la bienvenida vuelve a salir y se olvida qué trámites se han visto.
        await session.defaultSession.clearStorageData({ storages: ['localstorage'] });
        app.relaunch();
        app.exit(0);
      }
    },
    abrirEnlace: async (u) => {
      const url = new URL(z.string().parse(u));
      if (url.protocol === 'https:') await shell.openExternal(url.href);
    },
    mostrarArchivo: async (ruta) => {
      const r = z.string().parse(ruta);
      // Solo archivos que el propio trámite ha descargado.
      if (
        tramites.lista().some((t) => tramites.registro(t.id)?.descargas.some((d) => d.ruta === r))
      )
        shell.showItemInFolder(r);
    },
  };

async function guardarPerfil(nuevo: Perfil) {
  perfil = nuevo;
  await almacen.escribir('perfil.bin', perfil);
  emitir({ tipo: 'estado', estado: estadoApp() });
}

function crearVentana() {
  ventana = new BrowserWindow({
    width: 1340,
    height: 880,
    minWidth: 1040,
    minHeight: 660,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 20 },
    backgroundColor: '#f5f5f5',
    webPreferences: {
      preload: path.join(RAIZ, 'preload.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
    },
  });
  ventana.webContents.on('will-navigate', (e) => e.preventDefault());
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  ventana.once('ready-to-show', () => ventana?.show());
  ventana.on('closed', () => {
    ventana = null;
  });
  void ventana.loadURL(`${ORIGEN_APP}/index.html`);
}

function menu() {
  const plantilla: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about', label: 'Acerca de Reforma Digital' },
        { type: 'separator' },
        {
          label: 'Ajustes…',
          accelerator: 'CmdOrCtrl+,',
          click: () => emitir({ tipo: 'menu', vista: 'ajustes' }),
        },
        { type: 'separator' },
        { role: 'hide', label: 'Ocultar Reforma Digital' },
        { role: 'hideOthers', label: 'Ocultar otros' },
        { role: 'unhide', label: 'Mostrar todo' },
        { type: 'separator' },
        { role: 'quit', label: 'Salir de Reforma Digital' },
      ],
    },
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Nuevo trámite',
          accelerator: 'CmdOrCtrl+N',
          click: () => emitir({ tipo: 'menu', vista: 'inicio' }),
        },
        {
          label: 'Mis datos',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => emitir({ tipo: 'menu', vista: 'datos' }),
        },
        { type: 'separator' },
        { role: 'close', label: 'Cerrar ventana' },
      ],
    },
    { label: 'Edición', role: 'editMenu' },
    {
      label: 'Ver',
      submenu: [
        ...(app.isPackaged
          ? []
          : [
              { role: 'reload' as const },
              { role: 'toggleDevTools' as const },
              { type: 'separator' as const },
            ]),
        { role: 'resetZoom', label: 'Tamaño real' },
        { role: 'zoomIn', label: 'Ampliar' },
        { role: 'zoomOut', label: 'Reducir' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
      ],
    },
    { label: 'Ventana', role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(plantilla));
}

app.on('second-instance', () => {
  ventana?.show();
  ventana?.focus();
});

// Certificados del llavero de macOS: la persona elige con cuál se identifica en cada web.
app.on('select-client-certificate', (event, webContents, url, lista, responder) => {
  event.preventDefault();
  // La lectura oculta de webs oficiales nunca se identifica.
  if (!lista.length || (webContents && esLectura(webContents.session))) return responder();
  // Electron da «host:puerto», no una URL completa.
  const sitio = url.replace(/^[a-z]+:\/\//i, '').replace(/[/:].*$/, '');
  const opciones = {
    type: 'question' as const,
    message: `${sitio} pide un certificado digital`,
    detail:
      'Elige con qué certificado quieres identificarte. El asistente no ve tu certificado ni su contraseña.',
    buttons: [...lista.map((c) => c.subjectName || c.issuerName), 'Cancelar'],
    cancelId: lista.length,
  };
  const padre = (webContents && BrowserWindow.fromWebContents(webContents)) ?? ventana;
  void (padre ? dialog.showMessageBox(padre, opciones) : dialog.showMessageBox(opciones)).then(
    (r) => responder(r.response < lista.length ? lista[r.response] : undefined),
  );
});

app.on('web-contents-created', (_e, contents) => {
  // Ninguna web puede pedir credenciales HTTP básicas ni abrir vistas nuevas por su cuenta.
  contents.on('login', (event) => event.preventDefault());
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});

app
  .whenReady()
  .then(async () => {
    const renderer = path.join(RAIZ, 'renderer');
    protocol.handle('app', (req) => {
      const { pathname } = new URL(req.url);
      const destino = path.normalize(path.join(renderer, decodeURIComponent(pathname)));
      if (!destino.startsWith(renderer + path.sep))
        return new Response('No encontrado', { status: 404 });
      return net.fetch(pathToFileURL(destino).href);
    });
    almacen = await Almacen.abrir(path.join(app.getPath('userData'), 'datos'));
    secretos = (await almacen.leer<Secretos>('secretos.bin')) ?? { ajustes: AJUSTES_INICIALES };
    secretos.ajustes = { ...AJUSTES_INICIALES, ...secretos.ajustes };
    // Con «cerrar sesiones», las sesiones de las webs viven en memoria y se borran las que quedaran.
    if (secretos.ajustes.cerrarSesiones)
      await fs.rm(path.join(app.getPath('userData'), 'Partitions'), {
        recursive: true,
        force: true,
      });
    perfil = (await almacen.leer<Perfil>('perfil.bin')) ?? {};
    tramites = new Tramites(almacen, {
      perfil: () => perfil,
      guardarPerfil: async (v) => guardarPerfil({ ...perfil, ...v }),
      proveedor: () => configProveedor(secretos.ajustes.modelo, secretos.ajustes.retencionCero),
      sesionesGuardadas: () => !secretos.ajustes.cerrarSesiones,
      verificarIdentidad: (motivo) => verificar(motivo, secretos.ajustes.touchIdEnConfirmaciones),
      detector: cargarDetector,
      // Las interfaces comunitarias llegarán más adelante: de momento no se cargan.
      extension: () => null,
      ventana: () => ventana,
      emitir,
      alCambiarLista: () => emitir({ tipo: 'estado', estado: estadoApp() }),
    });
    await tramites.cargar();
    ipcMain.handle('rd', async (event, metodo: unknown, ...args: unknown[]) => {
      if (!event.senderFrame?.url.startsWith(ORIGEN_APP + '/'))
        throw new Error('Origen no permitido');
      const fn =
        typeof metodo === 'string' && Object.hasOwn(metodos, metodo)
          ? metodos[metodo as keyof typeof metodos]
          : null;
      if (!fn) throw new Error('Método desconocido');
      return fn(...args);
    });
    menu();
    crearVentana();
    // Se carga ya para que el primer mensaje no espere; los fallos se muestran al enviarlo.
    cargarDetector().catch(() => undefined);
    app.on('activate', () => {
      if (!ventana) crearVentana();
    });
  })
  .catch(async (e: unknown) => {
    // Sin llavero o con datos dañados la app no puede arrancar: se explica y se ofrece empezar de cero.
    const r = await dialog.showMessageBox({
      type: 'error',
      message: 'Reforma Digital no ha podido abrir tus datos',
      detail: `${e instanceof Error ? e.message : String(e)}\n\nSi macOS te ha pedido acceso al llavero y lo has denegado, sal y vuelve a abrir la app. Si el problema sigue, puedes borrar lo que la app guarda en este Mac (datos, trámites, ajustes y sesiones de las webs) y empezar de cero.`,
      buttons: ['Salir', 'Borrar todo y reiniciar'],
      defaultId: 0,
      cancelId: 0,
    });
    if (r.response === 1) {
      for (const dir of ['datos', 'Partitions'])
        await fs.rm(path.join(app.getPath('userData'), dir), { recursive: true, force: true });
      app.relaunch();
    }
    app.exit(0);
  });

app.on('before-quit', () => tramites?.detenerTodo());
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
