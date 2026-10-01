/**
 * Recorrido de la web oficial real para npm run site:live / site:record / site:preview.
 * Contrato y reglas: scripts/lib/flow.ts. Consulta pública del Fichero de Denominaciones con
 * un término genérico (datos públicos de asociaciones, no de personas). Sin identificación.
 */
import type { Flow } from '../../scripts/lib/flow.ts';

const CONSULTA = 'https://sede.interior.gob.es/portal/sede/asociacionesLegacy';

const flow: Flow = {
  start: CONSULTA,

  async original({ page, waitOfficial, capture, fixture }) {
    await page.goto(CONSULTA);
    await waitOfficial('#denominacion');
    await fixture('busqueda');
    await capture('1-busqueda');
    await page.fill('#denominacion', 'vecinos');
    await page.click('#buscar');
    await waitOfficial('table.custom-table');
    await fixture('resultados');
    await capture('2-resultados');
    await page.fill('#denominacion', 'zzqxwv');
    await page.click('#buscar');
    await waitOfficial('#denominacion');
    await page.waitForLoadState('load');
    await fixture('sin-resultados');
    await capture('3-sin-resultados');
  },

  async enhanced({ page, waitOfficial, waitInterface, check, capture }) {
    await page.goto(CONSULTA);
    await waitOfficial('#denominacion');
    await waitInterface();
    check(
      'Consulta: «Interfaz comunitaria · sitio oficial»',
      await page.getByText('Interfaz comunitaria · sitio oficial').first().isVisible(),
    );
    await capture('1-busqueda');
    await page.locator('[data-binding="denominacion"] input').fill('vecinos');
    const official = await page.inputValue('#denominacion');
    check('Consulta: el campo conectado escribe en el oficial', official === 'vecinos', official);
    await page.locator('[data-binding="denominacion"] input').press('Enter');
    await waitOfficial('table.custom-table');
    await waitInterface();
    check(
      'Resultados: tabla oficial visible',
      await page.locator('table.custom-table').isVisible(),
    );
    await capture('2-resultados');
  },

  preview: [{ name: '1-busqueda', url: CONSULTA }],
};

export default flow;
