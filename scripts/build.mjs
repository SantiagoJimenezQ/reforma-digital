import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { readSites, adapterPlugin } from './sites.mjs';

const test = process.argv.includes('--test');
const outDir = path.resolve(test ? 'dist-test' : 'dist');
const sites = await readSites();
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const matches = sites.flatMap((site) =>
  site.origins.map((origin) => `${origin}${site.pathPrefix}*`),
);
if (test) matches.push('http://127.0.0.1:4173/citaPreviaDni/*');
await build({
  configFile: false,
  root: path.resolve('apps/extension'),
  plugins: [react()],
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: false,
    modulePreload: false,
    rollupOptions: { input: path.resolve('apps/extension/popup.html') },
  },
});
await build({
  configFile: false,
  plugins: [react(), tailwind(), adapterPlugin(sites)],
  define: { __BG_TEST__: JSON.stringify(test), 'process.env.NODE_ENV': '"production"' },
  build: {
    outDir,
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      entry: path.resolve('apps/extension/src/content.ts'),
      name: 'BetterGovernment',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
  },
});
await mkdir(outDir, { recursive: true });
await writeFile(
  path.join(outDir, 'manifest.json'),
  JSON.stringify(
    {
      manifest_version: 3,
      name: test ? 'Better Government · Test' : 'Better Government',
      version: pkg.version,
      description:
        'Interfaces comunitarias para trámites públicos. Procesamiento local, sin telemetría.',
      minimum_chrome_version: '120',
      permissions: ['storage'],
      action: { default_popup: 'popup.html', default_title: 'Better Government' },
      content_scripts: [
        {
          matches,
          js: ['content.js'],
          run_at: 'document_idle',
          all_frames: false,
          world: 'ISOLATED',
        },
      ],
      content_security_policy: {
        extension_pages:
          "script-src 'self'; object-src 'none'; connect-src 'none'; base-uri 'none'",
      },
    },
    null,
    2,
  ) + '\n',
);
console.log(`Extension built in ${outDir}. ${sites.length} site adapter(s).`);
