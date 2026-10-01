import type { ReactNode } from 'react';
import type { DomBridge } from '@better-government/bridge';
import { BridgeProvider } from '@better-government/react';
import { OfficialDivider } from '@better-government/design';
import type { Enhancement } from '@better-government/registry';

/**
 * Colocación común en las páginas de la AEAT: barra comunitaria y guía alrededor del título
 * oficial, y el rótulo «Información oficial de esta página» antes del contenido oficial.
 */
export function aeatLayout(
  title: Element,
  officialStart: Element,
  bridge: DomBridge,
  view: () => ReactNode,
): Pick<Enhancement, 'shell' | 'panels'> {
  return {
    shell: { anchor: title, position: 'beforebegin' },
    panels: [
      {
        anchor: title,
        position: 'afterend',
        render: () => <BridgeProvider value={bridge}>{view()}</BridgeProvider>,
      },
      { anchor: officialStart, position: 'beforebegin', render: () => <OfficialDivider /> },
    ],
  };
}
