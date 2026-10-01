import { readFileSync } from 'node:fs';
import { afterEach, expect, it } from 'vitest';
import type { Enhancement } from '@reforma-digital/registry';
import { dniAdapter } from '../src';

/** HTML real de las páginas públicas (npm run site:live -- dni), sin scripts ni tokens. */
function real(name: 'real-inicio' | 'real-identificacion') {
  const html = readFileSync(`sites/dni/fixtures/${name}.html`, 'utf8');
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  for (const el of Array.from(parsed.querySelectorAll('*')))
    for (const attr of Array.from(el.attributes))
      if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
  document.body.innerHTML = parsed.body.innerHTML;
  // Relative links resolve against the official page URL, as in the browser.
  document.head.querySelector('base')?.remove();
  const base = document.createElement('base');
  base.href = 'https://www.citapreviadnie.es/citaPreviaDni/Inicio.action';
  document.head.append(base);
}
let enhancement: Enhancement | null;
afterEach(() => {
  enhancement?.bridge.dispose();
  enhancement = null;
  document.body.innerHTML = '';
  document.head.querySelector('base')?.remove();
});

it('enhances the real entry page with one access card', () => {
  real('real-inicio');
  enhancement = dniAdapter.prepare(document, new URL(dniAdapter.homepage), () => {});
  expect(enhancement?.slots).toHaveLength(1);
});

it('connects the five real identification inputs and repeats the official help text', () => {
  real('real-identificacion');
  enhancement = dniAdapter.prepare(
    document,
    new URL('/citaPreviaDni/InicioDNINIE.action', dniAdapter.homepage),
    () => {},
  );
  expect(enhancement?.slots).toHaveLength(5);
  expect(enhancement?.bridge.fieldSpec('expiry').help).toBe('dd/mm/aaaa o PERMANENTE');
  expect(enhancement?.bridge.fieldSpec('support').help).toBe(
    'Ej. AAA000000, solo para DNI Electrónico',
  );
  // The CAPTCHA stays an original control.
  expect(enhancement?.slots.some((slot) => slot.source.id === 'codSeguridad')).toBe(false);
});
