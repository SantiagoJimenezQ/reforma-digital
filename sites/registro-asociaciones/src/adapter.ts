import { createSiteAdapter } from '@better-government/registry';
import config from '../site.config.json';
import { pages } from './pages';

export const adapter = createSiteAdapter(config, pages);
