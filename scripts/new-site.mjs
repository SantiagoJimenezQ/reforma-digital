import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
const [id, origin, prefix = '/'] = process.argv.slice(2);
if (
  !id ||
  !/^[a-z][a-z0-9-]*$/.test(id) ||
  (origin &&
    (new URL(origin).protocol !== 'https:' ||
      new URL(origin).origin !== origin ||
      origin.includes('*'))) ||
  !prefix.startsWith('/') ||
  !prefix.endsWith('/') ||
  prefix.includes('*')
) {
  throw new Error('Usage: npm run site:new -- site-id [https://exact.official.host] [/path/]');
}
const directory = path.join('sites', id);
try {
  await access(directory);
  throw new Error('Site already exists');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
for (const folder of ['src/pages', 'src/components', 'src/styles', 'fixtures', 'tests'])
  await mkdir(path.join(directory, folder), { recursive: true });
const files = {
  'site.config.json': JSON.stringify(
    {
      id,
      name: id,
      enabled: false,
      origins: origin ? [origin] : [],
      pathPrefix: prefix,
      homepage: origin ? origin + prefix : '',
      status: 'experimental',
    },
    null,
    2,
  ),
  'package.json': JSON.stringify(
    {
      name: `@better-government/site-${id}`,
      version: '0.1.0',
      private: true,
      type: 'module',
      exports: './src/adapter.ts',
      dependencies: {
        '@better-government/bridge': '*',
        '@better-government/react': '*',
        '@better-government/registry': '*',
      },
    },
    null,
    2,
  ),
  'src/adapter.ts': `import { createSiteAdapter } from '@better-government/registry';\nimport config from '../site.config.json';\nimport { pages } from './pages';\n\nexport const adapter = createSiteAdapter(config, pages);`,
  'src/pages/index.ts': `import type { SitePage } from '@better-government/registry';\n\n// Add each reviewed page here. Each folder contains page.tsx and bindings.ts.\nexport const pages: SitePage[] = [];`,
  'src/components/README.md':
    '# Componentes del portal\n\nComponentes React compartidos entre las pantallas de este portal. Los componentes comunes a varios portales pertenecen a packages/react.',
  'src/styles/README.md':
    '# Estilos del portal\n\nTailwind en los componentes y CSS específico en esta carpeta. Acota cualquier estilo sobre la página original a su atributo data-bg-site.',
  'fixtures/README.md':
    '# Páginas de prueba\n\nHTML sintético o anonimizado para probar las conexiones. Documenta su origen. Nunca incluyas documentos personales, cookies, tokens reales ni capturas de sesiones autenticadas.',
  'tests/README.md':
    '# Pruebas del portal\n\nAñade pruebas *.test.ts para rutas, conexiones, validaciones y recuperación. Las pruebas con la extensión cargada viven en tests/e2e, en la raíz del repositorio.',
  'README.md': `# ${id}\n\nSubproyecto preparado, todavía sin interfaces implementadas. enabled: false lo excluye del código y de los permisos de la extensión.\n\n## Organización\n\n- src/pages/<pantalla>/page.tsx: interfaz y preparación de esa pantalla.\n- src/pages/<pantalla>/bindings.ts: conexiones exactas con los controles originales.\n- src/pages/index.ts: registro de pantallas.\n- src/components/: componentes propios compartidos.\n- src/styles/: estilos propios.\n- fixtures/: HTML de prueba sin datos personales.\n- tests/: pruebas de rutas y comportamiento.\n\nAntes de activar el portal, define sus dominios exactos, implementa al menos una pantalla y documenta qué has verificado. Consulta ../../CONTRIBUTING.md.`,
};
for (const [file, content] of Object.entries(files))
  await writeFile(path.join(directory, file), content + '\n');
console.log(
  `Created ${directory} as a disabled workspace. Run npm install to update workspace links.`,
);
