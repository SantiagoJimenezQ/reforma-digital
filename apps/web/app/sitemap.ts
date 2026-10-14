import type { MetadataRoute } from 'next';
import { siteUrl } from '../lib/site';
import { congressBase, congressSections } from '../lib/congreso/routes';

// Solo páginas indexables: /chat y /admin llevan noindex.
const pages = [
  '/',
  '/equipo',
  '/sources',
  '/how-it-works',
  '/privacy',
  '/api',
  ...congressSections.flatMap(({ pages }) =>
    pages.map(([, path]) => `${congressBase}${path ? `/${path}` : ''}`),
  ),
];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map((path) => ({ url: new URL(path, siteUrl).href }));
}
