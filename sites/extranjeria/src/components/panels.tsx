import type { ReactNode } from 'react';
import type { DomBridge } from '@better-government/bridge';
import { BridgeProvider } from '@better-government/react';
import { OfficialDivider } from '@better-government/design';
import type { Enhancement } from '@better-government/registry';

/**
 * La barra comunitaria va justo antes del título oficial: la cabecera Morfos es fixed en móvil
 * y taparía una barra colocada al principio de <body>.
 */
export function communityBar(header: Element): NonNullable<Enhancement['shell']> {
  return { anchor: header, position: 'beforebegin' };
}

/**
 * Paneles de una pantalla: la guía justo después del título oficial y el rótulo
 * «Información oficial de esta página» al principio del contenido oficial.
 */
export function screenPanels(
  header: Element,
  content: Element,
  bridge: DomBridge,
  view: () => ReactNode,
): NonNullable<Enhancement['panels']> {
  return [
    {
      anchor: header,
      position: 'afterend',
      render: () => <BridgeProvider value={bridge}>{view()}</BridgeProvider>,
    },
    { anchor: content, position: 'afterbegin', render: () => <OfficialDivider /> },
  ];
}
