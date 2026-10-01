import { expect } from '@playwright/test';
import { test } from './extension-fixture';

/** Registro Nacional de Asociaciones on the local playground, with real captured HTML. */
const consulta = 'http://127.0.0.1:4173/portal/sede/asociacionesLegacy';

test('connected search field drives the official form and keeps "Búsqueda exacta" original', async ({
  extension,
}) => {
  const page = await extension.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:4173)/, (route) => route.abort());
  await page.goto(consulta);
  const field = page.locator('[data-binding="denominacion"] input');
  await field.fill('vecinos');
  await expect(page.locator('#denominacion')).toHaveValue('vecinos');
  await expect(page.locator('#busquedaExacta')).toBeVisible();
  const search = page.waitForRequest(
    (r) => r.method() === 'POST' && r.url().endsWith('/portal/sede/asociacionesLegacy'),
  );
  await field.press('Enter');
  expect((await search).postData()).toContain('denominacion=vecinos');
});

test('the official minimum length still applies to the connected field', async ({ extension }) => {
  const page = await extension.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:4173)/, (route) => route.abort());
  await page.goto(consulta);
  const posts: string[] = [];
  page.on('request', (r) => r.method() === 'POST' && posts.push(r.url()));
  const field = page.locator('[data-binding="denominacion"] input');
  await field.fill('v');
  await field.press('Enter');
  await page.locator('#buscar').click();
  // minlength=2 on the official input: no search is sent and our field reports it.
  await expect
    .poll(() => field.evaluate((input: HTMLInputElement) => input.validity.tooShort))
    .toBe(true);
  expect(posts).toHaveLength(0);
});
