import { Component, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { matchesSite, type Enhancement, type SiteAdapter } from '@better-government/registry';
import uiStyles from './ui.css?inline';

export type RuntimeState = 'active' | 'original' | 'unsupported' | 'disabled';
export interface RuntimeController {
  restore: () => void;
  dispose: () => void;
  state: () => RuntimeState;
}

class RenderBoundary extends Component<
  { children: ReactNode; restore: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    queueMicrotask(this.props.restore);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Shell({
  enhancement,
  restore,
  demo,
}: {
  enhancement: Enhancement;
  restore: () => void;
  demo: boolean;
}) {
  return (
    <section className="bg-shell" aria-label="Better Government">
      <div className="bg-topbar">
        <span className="bg-brand">Better Government</span>
        <button type="button" className="bg-restore" onClick={restore}>
          Ver original
        </button>
      </div>
      <div className="bg-intro">
        <h1>{enhancement.title}</h1>
        <p>{enhancement.description}</p>
      </div>
      <p className="bg-notice">
        {demo
          ? 'Prueba local con datos ficticios. No reserva citas.'
          : 'Interfaz independiente del portal oficial.'}
      </p>
    </section>
  );
}

/** Mounts only known slots. Everything outside them, including security widgets, stays in place. */
export function mountAdapter(
  adapter: SiteAdapter,
  options: { url?: URL; demo?: boolean; onState?: (state: RuntimeState) => void } = {},
): RuntimeController {
  let state: RuntimeState = 'unsupported';
  const roots: Root[] = [];
  const hosts: HTMLElement[] = [];
  const sources: { source: HTMLElement; previous: string | null }[] = [];
  const sourceParents = new Map<HTMLElement, Node | null>();
  const sourceAppearance = new Map<HTMLElement, string>();
  const labels: { label: HTMLLabelElement; previous: string | null }[] = [];
  let enhancement: Enhancement | null = null;
  let observer: MutationObserver | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let pageStyle: HTMLStyleElement | undefined;
  const initialURL = location.href;
  const oldSite = document.body.getAttribute('data-bg-site');
  const notify = (next: RuntimeState) => {
    state = next;
    options.onState?.(next);
  };
  const cleanup = () => {
    observer?.disconnect();
    clearInterval(timer);
    document.removeEventListener('invalid', invalid, true);
    document.removeEventListener('focusin', originalFocus, true);
    window.removeEventListener('pagehide', restore);
    window.removeEventListener('popstate', restore);
    for (const { source, previous } of sources) {
      if (previous === null) source.removeAttribute('data-bg-source');
      else source.setAttribute('data-bg-source', previous);
    }
    for (const { label, previous } of labels) {
      if (previous === null) label.removeAttribute('data-bg-label');
      else label.setAttribute('data-bg-label', previous);
    }
    enhancement?.bridge.dispose();
    for (const root of roots) root.unmount();
    for (const host of hosts) host.remove();
    pageStyle?.remove();
    if (oldSite === null) document.body.removeAttribute('data-bg-site');
    else document.body.setAttribute('data-bg-site', oldSite);
  };
  const restore = () => {
    if (state !== 'active') return;
    cleanup();
    notify('original');
  };
  // Reveal before the browser focuses the invalid field and displays its own error.
  const invalid = (event: Event) => {
    if (sources.some(({ source }) => source === event.target)) restore();
  };
  const originalFocus = (event: Event) => {
    if (sources.some(({ source }) => source === event.target)) restore();
  };
  const controller = { restore, dispose: restore, state: () => state };
  const url = options.url ?? new URL(location.href);
  if (!matchesSite(adapter, url)) return controller;
  try {
    enhancement = adapter.prepare(document, url, restore);
  } catch {
    return controller;
  }
  if (!enhancement) return controller;
  const captured = enhancement;
  const sourcesUnique = new Set(captured.slots.map((slot) => slot.source));
  if (
    sourcesUnique.size !== captured.slots.length ||
    captured.slots.some(({ source }) => !source.isConnected)
  ) {
    captured.bridge.dispose();
    return controller;
  }
  notify('active');
  function makeHost(before: HTMLElement | null, content: ReactNode) {
    const host = document.createElement('div');
    host.setAttribute('data-bg-host', '');
    host.style.setProperty('display', 'block', 'important');
    host.style.setProperty('color-scheme', 'light', 'important');
    // Styling isolation only. A ShadowRoot is not a security boundary against the host page.
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = uiStyles;
    shadow.append(style);
    const mount = document.createElement('div');
    shadow.append(mount);
    if (before) before.before(host);
    else document.body.prepend(host);
    hosts.push(host);
    const root = createRoot(mount);
    roots.push(root);
    flushSync(() => root.render(<RenderBoundary restore={restore}>{content}</RenderBoundary>));
  }
  try {
    makeHost(null, <Shell enhancement={captured} restore={restore} demo={options.demo ?? false} />);
    for (const slot of captured.slots) {
      makeHost(slot.source, slot.render());
      sources.push({ source: slot.source, previous: slot.source.getAttribute('data-bg-source') });
      sourceParents.set(slot.source, slot.source.parentNode);
      sourceAppearance.set(
        slot.source,
        JSON.stringify([
          slot.source.getAttribute('style'),
          slot.source.hidden,
          slot.source.getAttribute('aria-hidden'),
        ]),
      );
      if (
        slot.source instanceof HTMLInputElement ||
        slot.source instanceof HTMLSelectElement ||
        slot.source instanceof HTMLTextAreaElement
      ) {
        for (const label of slot.source.labels ?? []) {
          if (label.contains(slot.source)) continue;
          labels.push({ label, previous: label.getAttribute('data-bg-label') });
          label.setAttribute('data-bg-label', '');
        }
      }
      slot.source.setAttribute('data-bg-source', '');
    }
    pageStyle = document.createElement('style');
    pageStyle.textContent = `[data-bg-source], [data-bg-label] { display: none !important; }\n${captured.pageStyles ?? ''}`;
    document.head.append(pageStyle);
    document.body.setAttribute('data-bg-site', adapter.id);
    document.addEventListener('invalid', invalid, true);
    document.addEventListener('focusin', originalFocus, true);
    window.addEventListener('pagehide', restore);
    window.addEventListener('popstate', restore);
    const health = () => {
      if (state !== 'active') return;
      try {
        if (
          location.href !== initialURL ||
          !captured.health() ||
          hosts.some((host) => !host.isConnected) ||
          sources.some(
            ({ source }) =>
              !source.isConnected ||
              source.parentNode !== sourceParents.get(source) ||
              JSON.stringify([
                source.getAttribute('style'),
                source.hidden,
                source.getAttribute('aria-hidden'),
              ]) !== sourceAppearance.get(source),
          )
        )
          restore();
      } catch {
        restore();
      }
    };
    observer = new MutationObserver(health);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    timer = setInterval(health, 300);
  } catch {
    restore();
  }
  return controller;
}
