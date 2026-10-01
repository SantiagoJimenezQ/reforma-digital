import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { matchesSite } from '@reforma-digital/registry';
import { mountAdapter, type RuntimeController } from '@reforma-digital/runtime';
import { adapter } from '../src/adapter';
import { consultaBindings, consultaState } from '../src/pages/consulta/bindings';

const CONSULTA = 'https://sede.interior.gob.es/portal/sede/asociacionesLegacy';

/** HTML real (npm run site:live -- registro-asociaciones), sin scripts ni tokens. */
function fixture(name: 'busqueda' | 'resultados' | 'sin-resultados') {
  const parsed = new DOMParser().parseFromString(
    readFileSync(`sites/registro-asociaciones/fixtures/${name}.html`, 'utf8'),
    'text/html',
  );
  for (const el of Array.from(parsed.querySelectorAll('*')))
    for (const attr of Array.from(el.attributes))
      if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
  document.body.innerHTML = parsed.body.innerHTML;
}
let controller: RuntimeController | undefined;
afterEach(() => {
  controller?.dispose();
  controller = undefined;
  document.body.innerHTML = '';
});

it('matches only the public search page', () => {
  expect(matchesSite(adapter, new URL(CONSULTA))).toBe(true);
  expect(matchesSite(adapter, new URL(`${CONSULTA}?`))).toBe(true);
  expect(matchesSite(adapter, new URL('https://sede.interior.gob.es/portal/sede/tramites'))).toBe(
    false,
  );
  expect(
    matchesSite(adapter, new URL('https://sede.interior.gob.es/portal-identificacion/login')),
  ).toBe(false);
});

it('reads the official field, its label and minimum length', () => {
  fixture('busqueda');
  const b = consultaBindings(document)!;
  expect(b.label).toBe('Palabras clave de la denominación');
  expect(b.minLength).toBe(2);
  expect(consultaState(document).kind).toBe('form');
});

it('describes the results and the official "no results" message', () => {
  fixture('resultados');
  expect(consultaState(document)).toMatchObject({ kind: 'results', rows: 30, page: '1' });
  fixture('sin-resultados');
  expect(consultaState(document)).toMatchObject({
    kind: 'empty',
    message: 'No existen asociaciones que cumplan los criterios de búsqueda',
  });
});

it('replaces only the search field; Enter uses the official "Buscar"', () => {
  fixture('busqueda');
  controller = mountAdapter(adapter, { url: new URL(CONSULTA) });
  expect(controller.state()).toBe('active');
  const official = document.querySelector<HTMLInputElement>('#denominacion')!;
  expect(official.hasAttribute('data-bg-source')).toBe(true);
  // «Búsqueda exacta» stays an original control (its value only changes on blur).
  expect(document.querySelector('#busquedaExacta')!.hasAttribute('data-bg-source')).toBe(false);
  const field = Array.from(document.querySelectorAll('[data-bg-host]'))
    .map((h) =>
      h.shadowRoot?.querySelector<HTMLInputElement>('[data-binding="denominacion"] input'),
    )
    .find(Boolean)!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(field, 'vecinos');
  field.dispatchEvent(new Event('input', { bubbles: true }));
  expect(official.value).toBe('vecinos');
  const search = vi.fn((event: Event) => event.preventDefault());
  document.querySelector('#buscar')!.addEventListener('click', search);
  field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  expect(search).toHaveBeenCalledOnce();
});
