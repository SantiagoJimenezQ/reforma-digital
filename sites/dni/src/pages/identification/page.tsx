import { DomBridge, fieldByLabel } from '@better-government/bridge';
import { BoundField, BridgeProvider } from '@better-government/react';
import type { SitePage } from '@better-government/registry';
import { identificationBindings, knownLabels } from './bindings';
import pageStyles from '../../styles/page.css?inline';

export const identificationPage: SitePage = {
  id: 'identification',
  matches: (url) => url.pathname === '/citaPreviaDni/InicioDNINIE.action' && !url.search,
  prepare(document, _url, restore) {
    const fields = identificationBindings(document);
    if (!fields) return null;
    const bridge = new DomBridge(fields, {}, { onIssue: restore });
    return {
      bridge,
      title: 'Identificación',
      description: 'DNI y pasaporte · Acceso con datos del documento',
      pageStyles,
      slots: Object.entries(fields).map(([id, { element }]) => ({
        source: element,
        render: () => (
          <BridgeProvider value={bridge}>
            <BoundField binding={id} />
          </BridgeProvider>
        ),
      })),
      health: () =>
        knownLabels.every(([id, label]) => fieldByLabel(document, label) === fields[id]!.element),
    };
  },
};
