// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { Evidence } from '../packages/core/src/index';
import { Sources, type SourceView } from '../apps/web/components/chat-sources';

const evidence = (id: string, url: string, content: string): Evidence => ({
  chunkId: id,
  documentId: `d-${id}`,
  sourceId: 'interior',
  canonicalUrl: url,
  title: `Documento ${id}`,
  heading: 'Requisitos',
  content,
  organization: 'Policía Nacional',
  jurisdiction: 'ES',
  authorityScore: 100,
  crawledAt: '2026-10-04T10:00:00Z',
  sourceUpdatedAt: null,
  score: 1,
  available: true,
});

it('muestra el fragmento citado sin enlaces ni HTML y salta a las otras fuentes', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );

  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  const first = evidence(
    'c1',
    'https://www.citapreviadnie.es/',
    '### Cita previa\n\n**Pide** cita [aquí](https://evil.example) <img src=x onerror=alert(1)>',
  );
  const second = evidence('c2', 'https://www.dnielectronico.es/', 'Requisitos de expedición.');
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  let view: SourceView | null = { evidence: [first, second], selected: first };
  const render = () =>
    root.render(
      createElement(Sources, {
        view,
        onClose: () => {},
        onSelect: (selected?: Evidence) => {
          view = { evidence: [first, second], ...(selected ? { selected } : {}) };
          render();
        },
      }),
    );
  try {
    await act(async () => render());
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    const excerpt = document.body.querySelector('.chat-source-excerpt')!;
    expect(excerpt.querySelector('h3')?.textContent).toBe('Cita previa');
    expect(excerpt.querySelector('strong')?.textContent).toBe('Pide');
    expect(excerpt.querySelector('a, img, script')).toBeNull();
    expect(document.body.textContent).toContain('Fragmento citado · 1');
    expect(document.body.textContent).toContain('Estatal');
    const official = document.body.querySelector<HTMLAnchorElement>(
      '.chat-source a[data-slot=button]',
    )!;
    expect(official.href).toBe(first.canonicalUrl);
    expect(official.target).toBe('_blank');
    expect(official.rel).toBe('noopener noreferrer');
    await act(async () =>
      document.body.querySelector<HTMLButtonElement>('.chat-source-card')!.click(),
    );
    expect(document.body.textContent).toContain('Fragmento citado · 2');
    expect(document.body.querySelector('.chat-source-title')?.textContent).toBe(second.title);
    await act(async () =>
      document.body.querySelector<HTMLButtonElement>('.chat-sheet-back')!.click(),
    );
    expect(document.body.querySelectorAll('.chat-source-card')).toHaveLength(2);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
