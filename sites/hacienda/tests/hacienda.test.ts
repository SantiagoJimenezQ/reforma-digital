import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { matchesSite, type Enhancement } from '@better-government/registry';
import { mountAdapter, type RuntimeController } from '@better-government/runtime';
import { adapter } from '../src/adapter';
import { asistenciaBindings } from '../src/pages/asistencia/bindings';
import { catalogoBindings } from '../src/pages/catalogo/bindings';

const ASISTENCIA = 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC29.shtml';
const CATALOGO = 'https://www2.agenciatributaria.gob.es/wlpl/TOCP-MUTE/ServiciosAsocCat';

/** HTML real de las páginas públicas (npm run site:live -- hacienda), sin scripts ni tokens. */
function fixture(name: 'asistencia' | 'catalogo', mutate: (html: string) => string = (h) => h) {
  const parsed = new DOMParser().parseFromString(
    mutate(readFileSync(`sites/hacienda/fixtures/${name}.html`, 'utf8')),
    'text/html',
  );
  for (const el of Array.from(parsed.querySelectorAll('*')))
    for (const attr of Array.from(el.attributes))
      if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
  document.body.innerHTML = parsed.body.innerHTML;
}
let enhancement: Enhancement | null = null;
let controller: RuntimeController | undefined;
afterEach(() => {
  enhancement?.bridge.dispose();
  enhancement = null;
  controller?.dispose();
  controller = undefined;
  document.body.innerHTML = '';
});

it('matches only the two public pages', () => {
  expect(matchesSite(adapter, new URL(ASISTENCIA))).toBe(true);
  expect(matchesSite(adapter, new URL(`${CATALOGO}?category=B`))).toBe(true);
  for (const url of [
    'https://www2.agenciatributaria.gob.es/wlpl/TOCP-MUTE/internet/identificacion',
    'https://sede.agenciatributaria.gob.es/Sede/inicio.html',
    'http://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC29.shtml',
    'https://sede.agenciatributaria.gob.es.evil.test/Sede/procedimientoini/GC29.shtml',
  ])
    expect(matchesSite(adapter, new URL(url))).toBe(false);
});

it('reads the three official options, their access and the Renta notice', () => {
  fixture('asistencia');
  const b = asistenciaBindings(document)!;
  expect(b.options.map((o) => o.label)).toEqual([
    'Asistencia y Cita para particulares',
    'Asistencia y Cita para colaboradores sociales',
    'Asistencia y Cita para profesionales Código de Buenas Prácticas',
  ]);
  expect(b.options.map((o) => o.access)).toEqual(['SinCert', 'Cert', 'Cert']);
  expect(b.notices.join(' ')).toMatch(
    /no son válidos para la confección de la declaración de la Renta/,
  );
  expect(b.otherChannels.join(' ')).toMatch(/91 333 5 333/);
});

it('lists every service of the catalogue with category and channels', () => {
  fixture('catalogo');
  const b = catalogoBindings(document)!;
  expect(b.services).toHaveLength(89);
  const clave = b.services.find((s) => s.id === 'A296')!;
  expect(clave.name).toBe('Registro en Cl@ve');
  expect(clave.category).toBe('Identificación electrónica');
  expect(clave.channels).toContain('Atención en Oficina');
  expect(b.categories.length).toBeGreaterThan(10);
});

it('keeps the original catalogue while its services are not rendered yet', () => {
  fixture('catalogo', (h) => h.replaceAll('service-web-component', 'x-pendiente'));
  expect(adapter.prepare(document, new URL(CATALOGO), () => {})).toBeNull();
  expect(adapter.expects(new URL(CATALOGO))).toBe(true);
});

it('requests a service through the official button', () => {
  fixture('catalogo');
  controller = mountAdapter(adapter, { url: new URL(CATALOGO) });
  expect(controller.state()).toBe('active');
  const official = document.querySelector<HTMLButtonElement>('#A296 button.btn-primary')!;
  const click = vi.fn();
  official.addEventListener('click', click);
  const button = Array.from(document.querySelectorAll('[data-bg-host]'))
    .flatMap((h) => Array.from(h.shadowRoot?.querySelectorAll('li') ?? []))
    .find((li) => li.querySelector('h3')?.textContent === 'Registro en Cl@ve')
    ?.querySelector('button');
  button!.click();
  expect(click).toHaveBeenCalledOnce();
});

it('finds «Cl@ve» services when typing «clave»', () => {
  fixture('catalogo');
  controller = mountAdapter(adapter, { url: new URL(CATALOGO) });
  const input = Array.from(document.querySelectorAll('[data-bg-host]'))
    .map((h) => h.shadowRoot?.querySelector<HTMLInputElement>('input[type="search"]'))
    .find(Boolean)!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, 'clave');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  const titles = Array.from(document.querySelectorAll('[data-bg-host]')).flatMap((h) =>
    Array.from(h.shadowRoot?.querySelectorAll('h3') ?? [], (t) => t.textContent),
  );
  expect(titles).toContain('Registro en Cl@ve');
});
