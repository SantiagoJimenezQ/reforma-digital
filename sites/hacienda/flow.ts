/**
 * Recorrido de la web oficial real para npm run site:live / site:record / site:preview.
 * Contrato y reglas: scripts/lib/flow.ts. Solo páginas públicas: nunca pulsa «Solicita
 * asistencia y cita» (lleva a la identificación con NIF y nombre).
 */
import type { Flow } from '../../scripts/lib/flow.ts';

const ASISTENCIA = 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC29.shtml';
const CATALOGO = 'https://www2.agenciatributaria.gob.es/wlpl/TOCP-MUTE/ServiciosAsocCat';

const flow: Flow = {
  start: ASISTENCIA,

  // Widget flotante oficial «¿Dudas?»: solo se oculta al capturar.
  captureCss: '#ClickToCall{display:none!important}',

  async original({ page, waitOfficial, capture, fixture }) {
    await page.goto(ASISTENCIA);
    await waitOfficial('.js-gestiones-destacadas a.js-componente-enlace-tramite');
    await fixture('asistencia');
    await capture('1-asistencia');
    await page.getByRole('link', { name: 'Catálogo de servicios de asistencia' }).click();
    await waitOfficial('service-web-component button');
    await fixture('catalogo');
    await capture('2-catalogo');
  },

  async enhanced({ page, waitOfficial, waitInterface, check, capture }) {
    await page.goto(ASISTENCIA);
    await waitOfficial('.js-gestiones-destacadas a.js-componente-enlace-tramite');
    await waitInterface();
    check(
      'Asistencia: «Interfaz comunitaria · sitio oficial»',
      await page.getByText('Interfaz comunitaria · sitio oficial').first().isVisible(),
    );
    check(
      'Asistencia: aviso oficial de Renta visible',
      await page
        .getByText('no son válidos para la confección de la declaración de la Renta')
        .first()
        .isVisible(),
    );
    await capture('1-asistencia');
    await page.getByRole('button', { name: /Ver el catálogo de servicios/ }).click();
    await waitOfficial('service-web-component button');
    await waitInterface();
    await page.getByLabel('Buscar servicio').fill('clave');
    check(
      'Catálogo: la búsqueda encuentra «Registro en Cl@ve»',
      await page.locator('[data-bg-host] h3', { hasText: /^Registro en Cl@ve$/ }).isVisible(),
    );
    await capture('2-catalogo');
  },

  preview: [
    { name: '1-asistencia', url: ASISTENCIA },
    { name: '2-catalogo', url: CATALOGO },
  ],
};

export default flow;
