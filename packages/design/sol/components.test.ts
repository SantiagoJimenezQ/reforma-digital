import { createElement, createRef } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { Button, Checkbox, Select } from './components';

describe('controles Sol', () => {
  it('compone un enlace sin perder su href, evento o ref', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const ref = createRef<HTMLAnchorElement>();
    let clicks = 0;
    try {
      flushSync(() =>
        root.render(
          createElement(
            Button,
            { asChild: true, variant: 'secondary' },
            createElement(
              'a',
              {
                href: '#destino',
                ref,
                onClick: () => {
                  clicks++;
                },
              },
              'Continuar',
            ),
          ),
        ),
      );
      expect(ref.current?.getAttribute('href')).toBe('#destino');
      expect(ref.current?.className).toBe('boton-claro');
      ref.current?.click();
      expect(clicks).toBe(1);
    } finally {
      flushSync(() => root.unmount());
      host.remove();
    }
  });
  it('envía el valor real del select, incluida la opción Todos vacía', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      for (const defaultValue of ['', 'PP']) {
        flushSync(() =>
          root.render(
            createElement(
              'form',
              {},
              createElement(Select, {
                key: defaultValue,
                name: 'grupo',
                label: 'Grupo',
                defaultValue,
                options: [
                  { value: '', label: 'Todos' },
                  { value: 'PP', label: 'PP' },
                ],
                icon: createElement('span', { 'aria-hidden': true }),
                selectedIcon: null,
              }),
            ),
          ),
        );
        const form = host.querySelector('form');
        if (!form) throw new Error('Falta el formulario');
        expect(new FormData(form).get('grupo')).toBe(defaultValue);
        expect(host.querySelector('[role="combobox"]')?.getAttribute('aria-label')).toBe('Grupo');
        expect(host.querySelector('[role="combobox"]')?.textContent).toBe(defaultValue || 'Todos');
      }
    } finally {
      flushSync(() => root.unmount());
      host.remove();
    }
  });
  it('conserva la etiqueta y comunica la selección del checkbox', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    let checked = false;
    try {
      flushSync(() =>
        root.render(
          createElement(Checkbox, {
            checked,
            onCheckedChange: (value) => {
              checked = value;
            },
            icon: createElement('span', { 'aria-hidden': true }),
            children: 'PP · 137',
          }),
        ),
      );
      const control = host.querySelector<HTMLButtonElement>('[role="checkbox"]');
      expect(control?.closest('label')?.textContent).toBe('PP · 137');
      flushSync(() => control?.click());
      expect(checked).toBe(true);
    } finally {
      flushSync(() => root.unmount());
      host.remove();
    }
  });
});
