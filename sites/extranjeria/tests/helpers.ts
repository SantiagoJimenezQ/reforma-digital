import { readFileSync } from 'node:fs';

export const URLS = {
  landing: 'https://sede.administracionespublicas.gob.es/pagina/index/directorio/icpplus',
  provincias: 'https://icp.administracionelectronica.gob.es/icpplus/index.html',
  tramites: 'https://icp.administracionelectronica.gob.es/icpplustiem/citar?p=28&locale=es',
  info: 'https://icp.administracionelectronica.gob.es/icpplustiem/acInfo;jsessionid=ABC.appdmzmol3_19254_icpplustiem',
  entrada: 'https://icp.administracionelectronica.gob.es/icpplustiem/acEntrada',
} as const;

export type Fixture = 'landing' | 'provincias' | 'tramites' | 'info';

/**
 * Loads a real captured page (fixtures/*.html) into jsdom. The official <script>s are not in the
 * fixtures, so inline handlers (onclick="envia()") are removed too: they point to missing code.
 */
export function fixture(name: Fixture, mutate: (html: string) => string = (html) => html) {
  const html = mutate(readFileSync(`sites/extranjeria/fixtures/${name}.html`, 'utf8'));
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  for (const el of Array.from(parsed.querySelectorAll('*')))
    for (const attr of Array.from(el.attributes))
      if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
  document.body.innerHTML = parsed.body.innerHTML;
}
