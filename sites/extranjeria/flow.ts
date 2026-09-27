/**
 * Recorrido de la web oficial real para npm run site:live / site:record / site:preview.
 * Contrato y reglas: scripts/lib/flow.ts. Se detiene en «Requisitos y forma de acceso»: nunca
 * pulsa «con/sin Cl@ve» ni introduce datos.
 */
import type { Flow } from '../../scripts/lib/flow.ts';

const LANDING = 'https://sede.administracionespublicas.gob.es/pagina/index/directorio/icpplus';
const ICP = 'https://icp.administracionelectronica.gob.es';
const PROVINCE = process.env.BG_PROVINCE ?? 'Madrid';
const TRAMITE = process.env.BG_TRAMITE ?? 'huellas';

const flow: Flow = {
  start: LANDING,

  // La barra de cookies oficial es fixed y tapa las capturas. Solo se oculta al capturar; no se acepta nada.
  captureCss: '#cookie-law-info-bar{display:none!important}',

  async original({ page, waitOfficial, capture, fixture }) {
    await page.goto(LANDING);
    await waitOfficial('form#formulario');
    await fixture('landing');
    await capture('1-landing');

    await page.click('form#formulario input[type="submit"]');
    await waitOfficial('#divProvincias select#form');
    await fixture('provincias');
    await capture('2-provincias');

    await page.selectOption('#divProvincias select#form', { label: PROVINCE });
    await page.click('#btnAceptar');
    await waitOfficial('#divGrupoTramites select');
    await fixture('tramites');
    await capture('3-tramites');

    const option = await page.evaluate((query) => {
      for (const select of Array.from(
        document.querySelectorAll<HTMLSelectElement>('#divGrupoTramites select'),
      )) {
        const match = Array.from(select.options).find((o) => o.text.toLowerCase().includes(query));
        if (match) return { id: select.id, value: match.value };
      }
      return null;
    }, TRAMITE);
    if (!option) throw new Error(`No hay trámite que contenga "${TRAMITE}" en ${PROVINCE}`);
    await page.selectOption(`[id="${option.id}"]`, option.value);
    await page.waitForTimeout(1500); // mensajes del trámite (AJAX oficial)
    await page.click('#btnAceptar');
    await waitOfficial('form[name="info"]');
    await fixture('info');
    await capture('4-info');
  },

  async enhanced({ page, waitOfficial, waitInterface, check, capture }) {
    const panel = () => page.locator('[data-bg-host]').nth(1);
    await page.goto(LANDING);
    await waitOfficial('form#formulario');
    await waitInterface();
    check(
      'Landing: «Interfaz comunitaria · sitio oficial»',
      await page.getByText('Interfaz comunitaria · sitio oficial').first().isVisible(),
    );
    check(
      'Landing: aviso RGPD oficial visible',
      await page.locator('#mainWindow fieldset').isVisible(),
    );
    await capture('1-landing');
    await capture('1-landing', panel());

    await page.getByRole('button', { name: /Empezar en la web oficial/ }).click();
    await waitOfficial('#divProvincias select#form');
    await waitInterface();
    await page.getByLabel('Buscar provincia').fill(PROVINCE.slice(0, 4).toLowerCase());
    await page.getByRole('radio', { name: PROVINCE, exact: true }).check();
    const official = await page.$eval('#divProvincias select#form', (s) => {
      const select = s as HTMLSelectElement;
      return select.options[select.selectedIndex]?.text;
    });
    check('Provincias: <select> oficial sincronizado', official === PROVINCE, official);
    await capture('2-provincias');
    await capture('2-provincias', panel());
    await page.getByRole('button', { name: new RegExp(`Continuar con ${PROVINCE}`) }).click();

    await waitOfficial('#divGrupoTramites select');
    await waitInterface();
    const continuar = page.getByRole('button', { name: /^Continuar/ });
    check('Trámites: «Continuar» deshabilitado sin trámite', await continuar.isDisabled());
    await page.getByLabel('Buscar trámite').fill(TRAMITE);
    await page.getByRole('radio').first().check();
    await page.waitForTimeout(1500);
    const selected = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLSelectElement>('#divGrupoTramites select'))
        .map((s) => s.value)
        .filter((v) => v !== '-1'),
    );
    check(
      'Trámites: un único grupo oficial seleccionado',
      selected.length === 1,
      selected.join(','),
    );
    await capture('3-tramites');
    await capture('3-tramites', panel());
    await continuar.click();

    await waitOfficial('form[name="info"]');
    await waitInterface();
    check(
      'Info: información oficial del trámite visible',
      await page.locator('form[name="info"] .show_code').isVisible(),
    );
    check(
      'Info: opción oficial «sin Cl@ve» presente (no se pulsa)',
      (await page.locator('#btnEntrar').count()) === 1,
    );
    await capture('4-info');
    await capture('4-info', panel());
  },

  preview: [
    { name: '1-landing', url: LANDING },
    { name: '2-provincias', url: `${ICP}/icpplus/index.html` },
    { name: '3-tramites', url: `${ICP}/icpplustiem/citar?p=28&locale=es` },
    { name: '3b-tramites-alicante', url: `${ICP}/icpco/citar?p=3&locale=es` },
    { name: '4-info', url: `${ICP}/icpplustiem/acInfo` },
  ],

  // Alicante tiene dos grupos de trámites (Oficinas de Extranjería + Policía Nacional).
  extraRecord: [{ url: `${ICP}/icpco/citar?p=3&locale=es`, ready: '#divGrupoTramites select' }],
};

export default flow;
