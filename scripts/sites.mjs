import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
export async function readSites() {
  const sites = [];
  for (const directory of await readdir('sites', { withFileTypes: true })) {
    if (!directory.isDirectory()) continue;
    const config = JSON.parse(
      await readFile(path.join('sites', directory.name, 'site.config.json'), 'utf8'),
    );
    if (config.id !== directory.name || !/^[a-z][a-z0-9-]*$/.test(config.id))
      throw new Error('Invalid site id');
    if (typeof config.enabled !== 'boolean')
      throw new Error('Sites must declare enabled: true or false');
    if (!config.enabled) continue;
    if (
      !Array.isArray(config.origins) ||
      !config.origins.length ||
      config.origins.some(
        (origin) =>
          new URL(origin).protocol !== 'https:' ||
          new URL(origin).origin !== origin ||
          origin.includes('*'),
      )
    )
      throw new Error('Sites must declare exact HTTPS origins');
    if (
      !config.pathPrefix.startsWith('/') ||
      !config.pathPrefix.endsWith('/') ||
      config.pathPrefix.includes('*')
    )
      throw new Error('Sites must declare a path prefix');
    if (!['experimental', 'verified'].includes(config.status))
      throw new Error('Invalid verification status');
    sites.push(config);
  }
  return sites.sort((a, b) => a.id.localeCompare(b.id));
}
export function adapterPlugin(sites) {
  return {
    name: 'site-adapters',
    resolveId(id) {
      if (id === 'virtual:site-adapters') return '\0site-adapters';
    },
    load(id) {
      if (id !== '\0site-adapters') return;
      return (
        sites
          .map(
            (site, index) =>
              `import { adapter as adapter${index} } from ${JSON.stringify(path.resolve('sites', site.id, 'src/adapter.ts'))};`,
          )
          .join('\n') +
        `\nexport const adapters = [${sites.map((_, i) => `adapter${i}`).join(',')}];`
      );
    },
  };
}
