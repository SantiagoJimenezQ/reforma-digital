import { DomBridge } from '@better-government/bridge';
import type { SitePage } from '@better-government/registry';
import { officialAccessLink } from './bindings';
import { AccessCard } from '../../components/AccessCard';
import pageStyles from '../../styles/page.css?inline';

export const accessPage: SitePage = {
  id: 'access',
  matches: (url) => url.pathname === '/citaPreviaDni/Inicio.action' && !url.search,
  prepare(document, _url, restore) {
    const access = officialAccessLink(document);
    if (!access) return null;
    const originalHref = access.href;
    const bridge = new DomBridge({}, {}, { onIssue: restore });
    return {
      bridge,
      title: 'Cita previa del DNI y pasaporte',
      description: 'DNI y pasaporte · Solicitud, consulta y anulación',
      pageStyles,
      slots: [{ source: access, render: () => <AccessCard source={access} /> }],
      health: () =>
        access.isConnected &&
        access.href === originalHref &&
        officialAccessLink(document) === access,
    };
  },
};
