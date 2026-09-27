import { landingPage } from './landing/page';
import { provinciasPage } from './provincias/page';
import { tramitesPage } from './tramites/page';
import { infoPage } from './info/page';

/**
 * Pantallas públicas del flujo, en orden. acEntrada (datos personales) y siguientes no tienen
 * pantalla registrada: conservan la interfaz original.
 */
export const pages = [landingPage, provinciasPage, tramitesPage, infoPage];
