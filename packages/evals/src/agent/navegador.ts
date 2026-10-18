import { chromium, type Browser, type Dialog, type Page } from '@playwright/test';
import type { Dialogo, Navegador } from '@reforma-digital/agent';

/** El mismo contrato que usa la app, sobre Chromium sin ventana. */
export class NavegadorPlaywright implements Navegador {
  /** URLs por las que ha pasado la página principal: sirven para detectar salidas de la sede. */
  readonly recorrido: string[] = [];
  /** Todo lo que ha pedido el navegador, desde cualquier página y de cualquier tipo (también XHR, fetch, beacons y formularios). */
  readonly peticiones: { url: string; cuerpo: string }[] = [];
  private nuevas: string[] = [];
  /** El diálogo de la web que espera respuesta: como en la app, lo responde el agente. */
  private abierto: { dialogo: Dialog; info: Dialogo } | null = null;
  private dialogos = 0;
  private constructor(
    private browser: Browser,
    readonly page: Page,
  ) {
    page.context().on('request', (r) => {
      this.peticiones.push({ url: r.url(), cuerpo: r.postDataBuffer()?.toString('utf8') ?? '' });
    });
    page.on('framenavigated', (f) => {
      if (f === page.mainFrame()) this.recorrido.push(f.url());
    });
    page.on('download', (d) => {
      this.nuevas.push(d.suggestedFilename());
    });
    page.on('dialog', (d) => {
      const tipo = d.type();
      if (tipo !== 'alert' && tipo !== 'confirm' && tipo !== 'prompt' && tipo !== 'beforeunload')
        return void d.dismiss();
      this.abierto = {
        dialogo: d,
        info: {
          id: ++this.dialogos,
          tipo,
          mensaje: d.message(),
          ...(d.defaultValue() ? { porDefecto: d.defaultValue() } : {}),
        },
      };
    });
  }

  /** `publico` se sirve desde `local`; el resto de internet no se carga (la salida queda registrada). */
  static async abrir(publico: string, local: string) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      locale: 'es-ES',
      viewport: { width: 1280, height: 860 },
    });
    await context.route('**/*', async (route) => {
      const url = route.request().url();
      if (!url.startsWith(publico + '/'))
        return route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<title>Fuera de la sede</title><p>Página externa</p>',
        });
      const response = await route.fetch({
        url: local + url.slice(publico.length),
        maxRedirects: 0,
      });
      const destino = response.headers()['location'];
      // Chromium no vuelve a enrutar una redirección servida desde aquí: se hace en la página.
      if (response.status() >= 300 && response.status() < 400 && destino)
        return route.fulfill({
          status: 200,
          headers: {
            'content-type': 'text/html',
            'set-cookie': response.headers()['set-cookie'] ?? '',
          },
          body: `<script>location.replace(${JSON.stringify(new URL(destino, url).href)})</script>`,
        });
      await route.fulfill({ response });
    });
    return new NavegadorPlaywright(browser, await context.newPage());
  }

  url = () => this.page.url();
  /** Se cumple cuando la web abre un diálogo: la página queda parada hasta que se responda. */
  private cuandoDialogo() {
    let quitar = () => {};
    const abierto = new Promise<void>((resolver) => {
      const avisar = () => resolver();
      this.page.once('dialog', avisar);
      quitar = () => this.page.off('dialog', avisar);
    });
    return { abierto, quitar };
  }
  async abrir(url: string) {
    // Un diálogo mientras carga la deja a medias hasta que se responda: se vuelve para verlo.
    const d = this.cuandoDialogo();
    await Promise.race([
      this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }),
      d.abierto,
    ]).finally(d.quitar);
  }
  async atras() {
    await this.page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  }
  evaluar<T>(expresion: string) {
    // Con un diálogo abierto la página no responde hasta que se conteste.
    if (this.abierto) return Promise.reject(new Error('La web tiene un diálogo abierto.'));
    const d = this.cuandoDialogo();
    return Promise.race([
      this.page.evaluate(expresion) as Promise<T>,
      d.abierto.then(() => {
        throw new Error('La web ha abierto un diálogo.');
      }),
    ]).finally(d.quitar);
  }
  dialogo() {
    return this.abierto?.info ?? null;
  }
  async responderDialogo(aceptar: boolean, texto?: string) {
    const a = this.abierto;
    this.abierto = null;
    if (aceptar) await a?.dialogo.accept(texto);
    else await a?.dialogo.dismiss();
  }
  /** Playwright no da por hecha una acción que abre un diálogo hasta que se responde: no se espera a eso. */
  private async hastaDialogo(accion: Promise<void>) {
    const d = this.cuandoDialogo();
    await Promise.race([accion, d.abierto]).finally(d.quitar);
  }
  async clic(x: number, y: number) {
    await this.hastaDialogo(this.page.mouse.click(x, y));
  }
  async insertarTexto(texto: string) {
    await this.page.keyboard.insertText(texto);
  }
  async tecla(tecla: Parameters<Navegador['tecla']>[0]) {
    await this.hastaDialogo(this.page.keyboard.press(tecla === 'Space' ? ' ' : tecla));
  }
  async esperar(ms = 400) {
    await this.page.waitForTimeout(ms);
    if (this.abierto) return;
    const d = this.cuandoDialogo();
    await Promise.race([
      this.page.waitForLoadState('load').catch(() => undefined),
      d.abierto,
    ]).finally(d.quitar);
  }
  descargas() {
    return this.nuevas.splice(0);
  }
  cerrar = () => this.browser.close();
}
