import { expect, type Page, type Request } from '@playwright/test';
import { test } from './extension-fixture';

/** Agencia Tributaria on the local playground, with HTML captured from the real public pages. */
const base = 'http://127.0.0.1:4173';

async function open(page: Page, url: string) {
  const external: Request[] = [];
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:4173)/, (route) => {
    external.push(route.request());
    return route.abort();
  });
  await page.goto(url);
  return external;
}

test('assistance page: three official options and the Renta notice', async ({ extension }) => {
  const page = await extension.newPage();
  const external = await open(page, `${base}/Sede/procedimientoini/GC29.shtml`);
  await expect(page.getByText('Interfaz comunitaria · sitio oficial')).toBeVisible();
  await expect(
    page.getByText('Asistencia y Cita para particulares').filter({ visible: true }),
  ).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('data-bg-page', 'asistencia');
  // The replicated official box is hidden; the official description (with the notice) is not.
  await expect(page.locator('.js-gestiones-destacadas')).toBeHidden();
  await expect(page.locator('#js-descripcion-canal')).toBeVisible();
  await page
    .getByRole('button', { name: /^Continuar/ })
    .first()
    .click();
  await expect
    .poll(() => external.map((r) => r.url()))
    .toContain('https://www2.agenciatributaria.gob.es/wlpl/TOCP-MUTE/internet/identificacion');
});

test('catalogue: search, filters and the official request button', async ({ extension }) => {
  const page = await extension.newPage();
  await open(page, `${base}/wlpl/TOCP-MUTE/ServiciosAsocCat`);
  await page.getByLabel('Buscar servicio').fill('clave');
  await expect(page.locator('[data-bg-host] h3', { hasText: /^Registro en Cl@ve$/ })).toBeVisible();
  await page.getByLabel('Canal', { exact: true }).selectOption('Videollamada');
  await expect(page.locator('[data-bg-host] h3', { hasText: /^Registro en Cl@ve$/ })).toBeVisible();
  await page.evaluate(() =>
    document
      .querySelector('#A296 button.btn-primary')!
      .addEventListener('click', () => (document.body.dataset.officialClick = 'A296')),
  );
  await page
    .getByRole('button', {
      name: 'Solicitar asistencia y cita para Registro en Cl@ve',
      exact: true,
    })
    .and(page.locator('[data-bg-host] *'))
    .click();
  await expect(page.locator('body')).toHaveAttribute('data-official-click', 'A296');
});
