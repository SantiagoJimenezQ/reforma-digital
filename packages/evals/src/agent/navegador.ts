import { chromium, type Browser, type Page } from '@playwright/test';
import type { Navegador } from '@reforma-digital/agent';

/** El mismo contrato que usa la app, sobre Chromium sin ventana. */
export class NavegadorPlaywright implements Navegador {
  /** URLs por las que ha pasado la página principal: sirven para detectar salidas de la sede. */
  readonly recorrido: string[] = [];
  /** Todo lo que ha pedido el navegador, desde cualquier página y de cualquier tipo (también XHR, fetch, beacons y formularios). */
  readonly peticiones: { url: string; cuerpo: string }[] = [];
  private nuevas: string[] = [];
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
  async abrir(url: string) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }
  async atras() {
    await this.page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  }
  evaluar<T>(expresion: string) {
    return this.page.evaluate(expresion) as Promise<T>;
  }
  async clic(x: number, y: number) {
    await this.page.mouse.click(x, y);
  }
  async insertarTexto(texto: string) {
    await this.page.keyboard.insertText(texto);
  }
  async tecla(tecla: Parameters<Navegador['tecla']>[0]) {
    await this.page.keyboard.press(tecla === 'Space' ? ' ' : tecla);
  }
  async esperar(ms = 400) {
    await this.page.waitForTimeout(ms);
    await this.page.waitForLoadState('load').catch(() => undefined);
  }
  descargas() {
    return this.nuevas.splice(0);
  }
  cerrar = () => this.browser.close();
}
