import { DomBridge, fieldByLabel } from '@reforma-digital/bridge';
import { BoundField, BridgeProvider } from '@reforma-digital/react';
import type { SitePage } from '@reforma-digital/registry';
import { identificationBindings, knownLabels } from './bindings';
import { pageClassName } from '../../styles/page';

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
      pageClassName,
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
