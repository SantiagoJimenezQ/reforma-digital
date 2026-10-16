import { once } from 'node:events';
import { existsSync, mkdirSync } from 'node:fs';
import { setTimeout as dormir } from 'node:timers/promises';
import path from 'node:path';
import {
  dialog,
  session,
  shell,
  WebContentsView,
  type BrowserWindow,
  type Session,
} from 'electron';
import { llamar, type Navegador } from '@reforma-digital/agent';
import { officialLevel } from '@reforma-digital/government/domains';
import type { Descarga, Rect } from '../shared/api';

/** Mundo aislado donde corre el script de lectura: la página no puede ver ni tocar sus variables. */
const MUNDO = 1000;
const ZOOM = 0.8;
const configuradas = new WeakSet<Session>();

/** En memoria: cookies, caché y lo que guarden las webs desaparecen al cerrar la app. */
export const particion = (tramite: string) => `tramite-${tramite}`;
const sesionLectura = () => session.fromPartition('lectura');
export const esLectura = (ses: Session) => ses === sesionLectura();
/** Lo que se abre dentro del navegador del trámite; AutoFirma se abre fuera y el resto se ignora. */
const EN_VISTA = /^(https?|blob):/i;

/**
 * Carga o quita la extensión de Reforma Digital en una sesión. Sus interfaces comunitarias solo
 * aparecen en los portales que tienen adaptación y conservan los controles oficiales.
 */
export async function interfacesComunitarias(ses: Session, ruta: string | null) {
  const cargada = ses.extensions
    .getAllExtensions()
    .find((e) => e.path === ruta || e.name.startsWith('Reforma Digital'));
  if (ruta && !cargada) await ses.extensions.loadExtension(ruta);
  if (!ruta && cargada) ses.extensions.removeExtension(cargada.id);
}

/** Sin permisos de cámara, ubicación ni notificaciones, y con el agente de usuario de Chrome. */
function prepararSesion(ses: Session) {
  // Las webs oficiales comprueban que sea Chrome: se quita la marca de Electron del agente de usuario.
  ses.setUserAgent(
    ses.getUserAgent().replace(/ (Electron|ReformaDigital|reforma-digital-desktop)\/\S+/gi, ''),
  );
  ses.setPermissionRequestHandler((_wc, _permiso, responder) => responder(false));
  ses.setPermissionCheckHandler(() => false);
}

/**
 * Lee el texto de una web oficial que rechaza las peticiones que no vienen de un navegador. Usa
 * una vista oculta con su propia sesión en memoria: no comparte cookies con ningún trámite.
 */
export async function leerConNavegador(url: string, signal: AbortSignal) {
  const ses = sesionLectura();
  if (!configuradas.has(ses)) {
    configuradas.add(ses);
    prepararSesion(ses);
    ses.on('will-download', (e) => e.preventDefault());
  }
  const view = new WebContentsView({
    webPreferences: { session: ses, sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  const wc = view.webContents;
  // Solo sigue redirecciones y navegaciones a webs oficiales por HTTPS: nunca a la red local.
  const soloOficiales = (e: { url: string; preventDefault(): void }) => {
    if (!officialLevel(e.url)) e.preventDefault();
  };
  wc.on('will-navigate', soloOficiales);
  wc.on('will-redirect', soloOficiales);
  const cerrar = () => {
    if (!wc.isDestroyed()) wc.close();
  };
  signal.addEventListener('abort', cerrar, { once: true });
  try {
    await Promise.race([
      wc.loadURL(url).catch((e: Error) => {
        if (!/ERR_ABORTED/.test(e.message)) throw e;
      }),
      new Promise((_r, rechazar) =>
        setTimeout(() => rechazar(new Error('La web oficial no ha cargado a tiempo.')), 25000),
      ),
    ]);
    // Algunas webs comprueban el navegador con JavaScript y recargan: se espera a que se calme.
    for (let i = 0; i < 16 && wc.isLoading(); i++) await dormir(500);
    await dormir(1200);
    const r = (await wc.executeJavaScriptInIsolatedWorld(MUNDO, [
      { code: llamar('leerTexto', 0, 200000) },
    ])) as { texto: string; titulo: string };
    return { url: wc.getURL(), titulo: r.titulo, texto: r.texto };
  } finally {
    signal.removeEventListener('abort', cerrar);
    cerrar();
  }
}

/** Pide confirmación antes de abrir AutoFirma desde una web. Otras apps no se abren. */
async function abrirAutoFirma(ventana: BrowserWindow | null, url: string) {
  if (!/^afirma:/i.test(url)) return;
  const opciones = {
    type: 'question' as const,
    buttons: ['Abrir', 'Cancelar'],
    defaultId: 0,
    cancelId: 1,
    message: 'La web quiere abrir AutoFirma para firmar',
    detail:
      'La firma la haces tú en AutoFirma, con tu certificado. Si no la tienes, descárgala de firmaelectronica.gob.es.',
  };
  const r = ventana
    ? await dialog.showMessageBox(ventana, opciones)
    : await dialog.showMessageBox(opciones);
  if (r.response !== 0) return;
  await shell
    .openExternal(url)
    .catch(() =>
      dialog.showErrorBox(
        'No se ha podido abrir',
        'Instala AutoFirma desde firmaelectronica.gob.es y vuelve a intentarlo.',
      ),
    );
}

/**
 * El navegador de un trámite: una vista dentro de la ventana, con su propia sesión en memoria
 * (no se mezcla con la de otros trámites y no deja nada en disco).
 */
export class NavegadorTramite implements Navegador {
  readonly view: WebContentsView;
  private nuevas: string[] = [];
  private enVentana: BrowserWindow | null = null;

  constructor(
    readonly tramite: string,
    private opciones: {
      carpetaDescargas: () => string;
      ventana: () => BrowserWindow | null;
      alCambiar: () => void;
      alDescargar: (d: Descarga) => void;
    },
  ) {
    const ses = session.fromPartition(particion(tramite));
    this.configurar(ses);
    this.view = new WebContentsView({
      webPreferences: {
        session: ses,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        spellcheck: false,
      },
    });
    this.view.setBackgroundColor('#ffffff');
    // Las sedes están pensadas para pantallas anchas: al 80 % caben en el panel sin cortarse.
    this.view.webContents.on('did-finish-load', () => this.view.webContents.setZoomFactor(ZOOM));
    const wc = this.view.webContents;
    wc.on('did-navigate', () => this.opciones.alCambiar());
    wc.on('did-navigate-in-page', () => this.opciones.alCambiar());
    // Las ventanas nuevas se abren en la misma vista: el trámite sigue en un solo sitio. Un
    // formulario con target="_blank" (p. ej. «descargar justificante») conserva su envío POST.
    wc.setWindowOpenHandler(({ url, referrer, postBody }) => {
      if (EN_VISTA.test(url))
        void wc
          .loadURL(url, {
            httpReferrer: referrer,
            ...(postBody && {
              postData: postBody.data,
              extraHeaders: `Content-Type: ${postBody.contentType}${postBody.boundary ? `; boundary=${postBody.boundary}` : ''}`,
            }),
          })
          .catch(() => undefined);
      else void abrirAutoFirma(this.opciones.ventana(), url);
      return { action: 'deny' };
    });
    wc.on('will-navigate', (e) => {
      if (EN_VISTA.test(e.url)) return;
      e.preventDefault();
      void abrirAutoFirma(this.opciones.ventana(), e.url);
    });
  }

  private configurar(ses: Session) {
    if (configuradas.has(ses)) return;
    configuradas.add(ses);
    prepararSesion(ses);
    // AutoFirma lanzada desde un iframe no pasa por will-navigate: llega como permiso para abrir
    // una app externa. Se deniega y, si es AutoFirma, se abre tras preguntar.
    ses.setPermissionRequestHandler((_wc, permiso, responder, detalles) => {
      if (permiso === 'openExternal' && 'externalURL' in detalles && detalles.externalURL)
        void abrirAutoFirma(this.opciones.ventana(), detalles.externalURL);
      responder(false);
    });
    ses.on('will-download', (_e, item) => {
      const dir = this.opciones.carpetaDescargas();
      const nombre = path.basename(item.getFilename()).replace(/[/\\:]/g, '_') || 'descarga';
      mkdirSync(dir, { recursive: true });
      let ruta = path.join(dir, nombre);
      for (let n = 2; existsSync(ruta); n++)
        ruta = path.join(dir, nombre.replace(/(\.[^.]*)?$/, ` (${n})$1`));
      item.setSavePath(ruta);
      item.once('done', (_ev, estado) => {
        if (estado !== 'completed') return;
        this.nuevas.push(path.basename(ruta));
        this.opciones.alDescargar({
          nombre: path.basename(ruta),
          ruta,
        });
      });
    });
  }

  get webContents() {
    return this.view.webContents;
  }

  /** Coloca la vista sobre el hueco que deja la interfaz, o la oculta con `null`. */
  colocar(ventana: BrowserWindow, rect: Rect | null) {
    if (this.enVentana !== ventana) {
      this.quitarDeVentana();
      ventana.contentView.addChildView(this.view);
      this.enVentana = ventana;
    }
    // La interfaz mide en píxeles CSS; con la ventana ampliada, la vista se coloca en puntos.
    const z = ventana.webContents.getZoomFactor();
    if (rect)
      this.view.setBounds({
        x: Math.round(rect.x * z),
        y: Math.round(rect.y * z),
        width: Math.round(rect.width * z),
        height: Math.round(rect.height * z),
      });
    this.view.setVisible(Boolean(rect));
  }

  url = () => this.webContents.getURL();

  async abrir(url: string) {
    this.asegurarEnVentana();
    await this.webContents.loadURL(url).catch((e: Error) => {
      // Una redirección o una navegación nueva cancelan la anterior: no es un error.
      if (!/ERR_ABORTED/.test(e.message)) throw e;
    });
    await this.esperar(200);
  }

  async atras() {
    if (this.webContents.navigationHistory.canGoBack()) this.webContents.navigationHistory.goBack();
    await this.esperar();
  }

  evaluar<T>(expresion: string): Promise<T> {
    return this.webContents.executeJavaScriptInIsolatedWorld(MUNDO, [
      { code: expresion },
    ]) as Promise<T>;
  }

  async clic(x: number, y: number) {
    this.asegurarEnVentana();
    const wc = this.webContents;
    // El script mide en píxeles CSS; los eventos van en puntos de la vista.
    const z = wc.getZoomFactor();
    const p = { x: Math.round(x * z), y: Math.round(y * z) };
    wc.sendInputEvent({ type: 'mouseMove', ...p });
    wc.sendInputEvent({ type: 'mouseDown', ...p, button: 'left', clickCount: 1 });
    wc.sendInputEvent({ type: 'mouseUp', ...p, button: 'left', clickCount: 1 });
  }

  async insertarTexto(texto: string) {
    await this.webContents.insertText(texto);
  }

  async tecla(tecla: Parameters<Navegador['tecla']>[0]) {
    const codigo = {
      Enter: 'Return',
      Tab: 'Tab',
      Escape: 'Escape',
      ArrowDown: 'Down',
      ArrowUp: 'Up',
      Backspace: 'Backspace',
      Space: 'Space',
    }[tecla];
    const wc = this.webContents;
    wc.sendInputEvent({ type: 'keyDown', keyCode: codigo });
    if (tecla === 'Enter') wc.sendInputEvent({ type: 'char', keyCode: '\r' });
    if (tecla === 'Space') wc.sendInputEvent({ type: 'char', keyCode: ' ' });
    wc.sendInputEvent({ type: 'keyUp', keyCode: codigo });
  }

  async esperar(ms = 400) {
    await dormir(ms);
    const wc = this.webContents;
    if (wc.isLoading()) await Promise.race([once(wc, 'did-stop-loading'), dormir(20000)]);
  }

  descargas() {
    return this.nuevas.splice(0);
  }

  /** Los eventos de ratón y teclado solo llegan a una vista que está en una ventana. */
  private asegurarEnVentana() {
    const v = this.opciones.ventana();
    if (v && this.enVentana !== v) this.colocar(v, null);
  }

  /** La vista sobrevive a la ventana: tras cerrarla y volver a abrir la app, pasa a la nueva. */
  private quitarDeVentana() {
    if (this.enVentana && !this.enVentana.isDestroyed())
      this.enVentana.contentView.removeChildView(this.view);
    this.enVentana = null;
  }

  async cerrar() {
    this.quitarDeVentana();
    this.view.webContents.close();
  }
}
