import type { ReactNode } from 'react';
import type { DomBridge } from '@better-government/bridge';

export interface Enhancement {
  /** In-place replacement. Source nodes never leave their original form or ancestry. */
  slots: { source: HTMLElement; render: () => ReactNode }[];
  bridge: DomBridge;
  title: string;
  description: string;
  pageStyles?: string;
  health: () => boolean;
}
export interface SiteAdapter {
  enabled?: boolean;
  id: string;
  name: string;
  origins: readonly string[];
  pathPrefix: string;
  homepage: string;
  status: 'experimental' | 'verified';
  /** Must return null on an unknown page or an ambiguous DOM. */
  prepare: (document: Document, url: URL, restore: () => void) => Enhancement | null;
}
export function matchesSite(adapter: SiteAdapter, url: URL): boolean {
  return (
    adapter.enabled !== false &&
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    adapter.origins.includes(url.origin) &&
    url.pathname.startsWith(adapter.pathPrefix)
  );
}

/** Each route owns its UI and bindings; the extension knows only this contract. */
export interface SitePage {
  id: string;
  matches: (url: URL) => boolean;
  prepare: SiteAdapter['prepare'];
}

export function createSiteAdapter(
  config: {
    id: string;
    name: string;
    enabled: boolean;
    origins: string[];
    pathPrefix: string;
    homepage: string;
    status: string;
  },
  pages: readonly SitePage[],
): SiteAdapter {
  if (!['experimental', 'verified'].includes(config.status)) throw new Error('Invalid site status');
  const adapter: SiteAdapter = {
    ...config,
    status: config.status === 'verified' ? 'verified' : 'experimental',
    prepare(document, url, restore) {
      if (!matchesSite(adapter, url)) return null;
      const matches = pages.filter((page) => page.matches(url));
      return matches.length === 1 ? matches[0]!.prepare(document, url, restore) : null;
    },
  };
  return adapter;
}
