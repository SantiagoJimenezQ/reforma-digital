/**
 * Recorrido de la web oficial real para npm run site:live / site:record / site:preview.
 * Contrato y reglas: scripts/lib/flow.ts. Solo entrada e identificación: nunca escribe datos,
 * no resuelve el CAPTCHA ni envía el formulario.
 */
import type { Flow } from '../../scripts/lib/flow.ts';

const INICIO = 'https://www.citapreviadnie.es/citaPreviaDni/Inicio.action';
const IDENTIFICACION = 'https://www.citapreviadnie.es/citaPreviaDni/InicioDNINIE.action';

const flow: Flow = {
  start: INICIO,

  // El aviso de cookies es fijo y tapa las capturas. Solo se oculta al capturar; no se acepta nada.
  captureCss: '.alertaModal{display:none!important}',

  async original({ page, waitOfficial, capture, fixture }) {
    await page.goto(INICIO);
    await waitOfficial('a[href*="InicioDNINIE.action"]');
    // Los fixtures sintéticos (landing/login) los usan las pruebas; el HTML real va aparte.
    await fixture('real-inicio');
    await capture('1-inicio');
    await page.getByRole('link', { name: 'Acceso con datos DNI/NIE' }).click();
    await waitOfficial('form');
    await fixture('real-identificacion');
    await capture('2-identificacion');
  },

  async enhanced({ page, waitOfficial, waitInterface, check, capture }) {
    await page.goto(INICIO);
    await waitOfficial('a[href*="InicioDNINIE.action"]');
    await waitInterface();
    check(
      'Inicio: «Interfaz comunitaria · sitio oficial»',
      await page.getByText('Interfaz comunitaria · sitio oficial').first().isVisible(),
    );
    await capture('1-inicio');
    await page.getByRole('link', { name: 'Acceder con DNI o NIE' }).click();
    await waitOfficial('form');
    await waitInterface();
    check(
      'Identificación: 5 campos conectados',
      (await page.locator('[data-bg-host] >> [data-binding]').count()) === 5,
    );
    check(
      'Identificación: CAPTCHA oficial visible',
      await page.locator('img[src*="aptcha"], #captcha, [id*="aptcha"]').first().isVisible(),
    );
    await capture('2-identificacion');
  },

  preview: [
    { name: '1-inicio', url: INICIO },
    { name: '2-identificacion', url: IDENTIFICACION },
  ],
};

export default flow;
