import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test';

/**
 * La app de escritorio compilada, de verdad: Electron, el detector local de datos personales y
 * las capas de privacidad, con un proveedor compatible con OpenAI simulado en local que se elige
 * en Ajustes. Usa un perfil y un llavero de prueba: no toca los datos de la app instalada.
 * Necesita Electron (pnpm --filter @reforma-digital/desktop exec install-electron) y la app
 * compilada con el modelo del detector (pnpm --filter @reforma-digital/agent detector y
 * pnpm --filter @reforma-digital/desktop build); si falta algo, se salta.
 */
const raiz = path.resolve(import.meta.dirname, '../../apps/desktop');
const electronInstalado = existsSync(path.join(raiz, 'node_modules/electron/dist'));
const preparada =
  electronInstalado &&
  existsSync(path.join(raiz, 'out/main.js')) &&
  existsSync(path.join(raiz, 'out/modelos/rampart'));

test.skip(!preparada, 'Falta Electron o la app compilada con el modelo del detector.');

const RESPUESTA = 'Hola, te ayudo con la renovación.';

/** Un servidor que responde como la API de OpenAI y guarda lo que recibe. */
function proveedorSimulado() {
  const peticiones: string[] = [];
  const servidor: Server = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/v1/models') {
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ data: [{ id: 'guion' }] }));
    }
    let cuerpo = '';
    req.on('data', (c: Buffer) => (cuerpo += c.toString('utf8')));
    req.on('end', () => {
      peticiones.push(cuerpo);
      const base = { id: 'r', created: 0, model: 'guion' };
      const uso = { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 };
      if (!(JSON.parse(cuerpo) as { stream?: boolean }).stream) {
        res.setHeader('content-type', 'application/json');
        return res.end(
          JSON.stringify({
            ...base,
            object: 'chat.completion',
            choices: [
              { index: 0, message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' },
            ],
            usage: uso,
          }),
        );
      }
      res.setHeader('content-type', 'text/event-stream');
      const trozo = (choices: unknown[], extra = {}) =>
        `data: ${JSON.stringify({ ...base, object: 'chat.completion.chunk', choices, ...extra })}\n\n`;
      res.write(
        trozo([
          { index: 0, delta: { role: 'assistant', content: RESPUESTA }, finish_reason: null },
        ]),
      );
      res.write(trozo([{ index: 0, delta: {}, finish_reason: 'stop' }], { usage: uso }));
      res.end('data: [DONE]\n\n');
    });
  });
  return { servidor, peticiones };
}

let app: ElectronApplication | undefined;
let perfil = '';
const { servidor, peticiones } = proveedorSimulado();

test.beforeAll(async () => {
  await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', r));
  perfil = mkdtempSync(path.join(tmpdir(), 'rd-escritorio-'));
  const env = { ...process.env };
  // Con esta variable, Electron arranca como Node.
  delete env.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({
    executablePath: createRequire(path.join(raiz, 'package.json'))('electron') as string,
    args: [raiz, `--user-data-dir=${perfil}`, '--use-mock-keychain'],
    env: env as Record<string, string>,
  });
});

test.afterAll(async () => {
  await app?.close();
  servidor.close();
  if (perfil) rmSync(perfil, { recursive: true, force: true });
});

test('con otro proveedor, un DNI escrito en el chat no le llega y el trámite se guarda cifrado', async () => {
  test.setTimeout(120_000);
  const ventana = await app!.firstWindow();
  // Bienvenida de la primera vez.
  await ventana.getByRole('button', { name: 'Continuar' }).click();
  await ventana.getByRole('button', { name: 'Continuar' }).click();
  await ventana.getByRole('button', { name: 'Empezar' }).click();

  await ventana.getByRole('button', { name: 'Ajustes' }).click();
  await ventana.getByText('Otro proveedor o un modelo en tu ordenador').click();
  const puerto = (servidor.address() as AddressInfo).port;
  await ventana.getByLabel('Dirección de la API').fill(`http://127.0.0.1:${puerto}/v1`);
  await ventana.getByLabel('Modelo', { exact: true }).fill('guion');
  await ventana.getByRole('button', { name: 'Probar y usar' }).click();
  await expect(ventana.getByRole('button', { name: 'Probar y usar' })).toBeEnabled();
  await expect(ventana.getByRole('alert')).toHaveCount(0);

  await ventana.getByRole('button', { name: 'Nuevo trámite' }).click();
  await ventana
    .getByPlaceholder(/quiero pedir cita/)
    .fill('Quiero renovar el DNI de mi hijo, que es el 87654321X, en Getafe');
  await ventana.getByRole('button', { name: 'Enviar' }).click();
  await expect(ventana.getByText(RESPUESTA)).toBeVisible({ timeout: 60_000 });

  const alModelo = peticiones.join('\n');
  expect(alModelo).toContain('renovar el DNI');
  expect(alModelo).not.toContain('87654321');
  expect(alModelo).toMatch(/\{\{documento_\d+\}\}/);

  // Todo lo de la app queda en el perfil de prueba y cifrado: ni el mensaje ni el DNI en claro.
  const datos = path.join(perfil, 'datos');
  const tramites = readdirSync(datos).filter((f) => f.startsWith('tramite-'));
  expect(tramites.length).toBe(1);
  const guardado = readFileSync(path.join(datos, tramites[0]!)).toString('latin1');
  expect(guardado).not.toContain('renovar');
  expect(guardado).not.toContain('87654321');
});
