import { readFileSync } from 'node:fs';
import { afterEach, expect, it } from 'vitest';
import { dniAdapter } from '../src';
import { matchesSite } from '@better-government/registry';
import type { Enhancement } from '@better-government/registry';
let enhancement: Enhancement | null;
afterEach(() => {
  enhancement?.bridge.dispose();
  enhancement = null;
  document.body.innerHTML = '';
});
function fixture(name: string) {
  const html = readFileSync(`sites/dni/fixtures/${name}.html`, 'utf8');
  document.body.innerHTML = new DOMParser().parseFromString(html, 'text/html').body.innerHTML;
}
it('matches only exact HTTPS origins and paths', () => {
  for (const url of [
    'http://www.citapreviadnie.es/citaPreviaDni/Inicio.action',
    'https://www.citapreviadnie.es.evil.test/citaPreviaDni/',
    'https://evil.test/?https://www.citapreviadnie.es',
    'https://www.citapreviadnie.es/other',
  ])
    expect(matchesSite(dniAdapter, new URL(url))).toBe(false);
  expect(matchesSite(dniAdapter, new URL(dniAdapter.homepage))).toBe(true);
});
it('does not alter unknown, blocked or authenticated pages', () => {
  document.body.innerHTML = '<h1>Página bloqueada</h1>';
  expect(dniAdapter.prepare(document, new URL(dniAdapter.homepage), () => {})).toBeNull();
  expect(
    dniAdapter.prepare(
      document,
      new URL('/citaPreviaDni/Autentificar.action', dniAdapter.homepage),
      () => {},
    ),
  ).toBeNull();
});
it('enhances the public entry link while leaving certificate and cookie controls native', () => {
  fixture('landing');
  const certificate = document.getElementById('certificate');
  enhancement = dniAdapter.prepare(document, new URL(dniAdapter.homepage), () => {});
  expect(enhancement?.slots).toHaveLength(1);
  expect(enhancement?.health()).toBe(true);
  expect(document.getElementById('certificate')).toBe(certificate);
  document.querySelector('a')!.href = 'https://evil.test';
  expect(enhancement?.health()).toBe(false);
});
it('only replaces the five declared login inputs, keeping CAPTCHA and submitter native', () => {
  fixture('login');
  const captcha = document.getElementById('captcha');
  enhancement = dniAdapter.prepare(
    document,
    new URL('/citaPreviaDni/InicioDNINIE.action', dniAdapter.homepage),
    () => {},
  );
  expect(enhancement?.slots).toHaveLength(5);
  expect(enhancement?.slots.some((slot) => slot.source === captcha)).toBe(false);
  expect(enhancement?.health()).toBe(true);
});
it('refuses ambiguous labels and unreviewed inline keyboard behavior', () => {
  fixture('login');
  document.getElementById('dni')!.setAttribute('onkeypress', 'return false');
  expect(
    dniAdapter.prepare(
      document,
      new URL('/citaPreviaDni/InicioDNINIE.action', dniAdapter.homepage),
      () => {},
    ),
  ).toBeNull();
  document.getElementById('dni')!.removeAttribute('onkeypress');
  document.body.insertAdjacentHTML('beforeend', '<input aria-label="Letra">');
  expect(
    dniAdapter.prepare(
      document,
      new URL('/citaPreviaDni/InicioDNINIE.action', dniAdapter.homepage),
      () => {},
    ),
  ).toBeNull();
});
