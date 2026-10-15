// Compila la app en out/: proceso principal (ESM, con sus dependencias dentro), preload (CommonJS,
// porque los preloads con sandbox no admiten ESM) e interfaz (React + sistema de diseño).
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';
import { cp, rm } from 'node:fs/promises';
import { builtinModules } from 'node:module';
import path from 'node:path';
import { designPostcss } from '@reforma-digital/design/postcss';

const raiz = path.resolve(import.meta.dirname, '..');
const out = path.join(raiz, 'out');
const externos = ['electron', ...builtinModules, ...builtinModules.map((m) => `node:${m}`)];
await rm(out, { recursive: true, force: true });

const node = (entrada, archivo, formato) =>
  build({
    configFile: false,
    logLevel: 'warn',
    root: raiz,
    define: { 'process.env.NODE_ENV': '"production"' },
    ssr: { noExternal: true },
    build: {
      ssr: path.join(raiz, entrada),
      outDir: out,
      emptyOutDir: false,
      target: 'node22',
      minify: false,
      sourcemap: false,
      rollupOptions: {
        external: externos,
        output: { format: formato, entryFileNames: archivo, codeSplitting: false },
      },
    },
  });

await node('src/main/index.ts', 'main.js', 'es');
await node('src/preload/index.ts', 'preload.cjs', 'cjs');
await build({
  configFile: false,
  logLevel: 'warn',
  root: path.join(raiz, 'src/renderer'),
  base: './',
  plugins: [react()],
  css: { postcss: { plugins: designPostcss({ content: [] }) } },
  build: {
    outDir: path.join(out, 'renderer'),
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 4000,
  },
});
// La extensión de Reforma Digital: la app la carga en el navegador de los trámites si la persona
// activa las interfaces comunitarias en Ajustes.
const repo = path.resolve(raiz, '../..');
execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: repo, stdio: 'ignore' });
await cp(path.join(repo, 'dist'), path.join(out, 'extension'), { recursive: true });
console.log('App compilada en', path.relative(process.cwd(), out));
