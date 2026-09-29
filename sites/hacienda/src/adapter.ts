import { createSiteAdapter } from '@reforma-digital/registry';
import config from '../site.config.json';
import { pages } from './pages';

export const adapter = createSiteAdapter(config, pages);
