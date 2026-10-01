import type { ReactNode } from 'react';
import type { DomBridge } from '@reforma-digital/bridge';
import { BridgeProvider } from '@reforma-digital/react';
import { OfficialDivider } from '@reforma-digital/design';
import type { Enhancement } from '@reforma-digital/registry';

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
