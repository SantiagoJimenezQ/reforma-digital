// Compila la app en out/: proceso principal (ESM, con sus dependencias dentro), preload (CommonJS,
// porque los preloads con sandbox no admiten ESM) e interfaz (React + sistema de diseño).
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync } from 'node:fs';
import { cp, mkdir, rm } from 'node:fs/promises';
import { builtinModules, createRequire } from 'node:module';
import path from 'node:path';
import { designPostcss } from '@reforma-digital/design/postcss';

const raiz = path.resolve(import.meta.dirname, '..');
const repo = path.resolve(raiz, '../..');
const out = path.join(raiz, 'out');
// ONNX Runtime (en WebAssembly) va aparte, en out/node_modules: carga su .wasm junto a su código.
const externos = [
  'electron',
  'onnxruntime-web',
  'onnxruntime-common',
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
];
await rm(out, { recursive: true, force: true });

const node = (entrada, archivo, formato) =>
  build({
    configFile: false,
    logLevel: 'warn',
    root: raiz,
    // La app no lleva claves: habla con el servidor de Reforma Digital (ver SERVIDOR en src/main/index.ts).
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.RD_SERVIDOR': JSON.stringify(process.env.RD_SERVIDOR ?? ''),
    },
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
await node('src/preload/navegador.ts', 'preload-navegador.cjs', 'cjs');
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
// El detector de datos personales: el modelo (pnpm --filter @reforma-digital/agent detector lo
// descarga y comprueba su huella) y ONNX Runtime en WebAssembly, el mismo en todos los sistemas.
const modelo = path.join(repo, 'packages/agent/.cache/rampart-edge');
if (existsSync(modelo))
  await cp(modelo, path.join(out, 'modelos/rampart-edge'), { recursive: true });
else
  console.warn(
    'Falta el modelo del detector: sin él, la app no enviará nada al asistente. Descárgalo con pnpm --filter @reforma-digital/agent detector.',
  );
const desdeAgente = createRequire(path.join(repo, 'packages/agent/package.json'));
const ortWeb = path.resolve(path.dirname(desdeAgente.resolve('onnxruntime-web')), '..');
const ortCommon = path.resolve(
  path.dirname(createRequire(path.join(ortWeb, 'package.json')).resolve('onnxruntime-common')),
  '../..',
);
// Solo lo que usa en Node: su entrada, el cargador de WebAssembly y el .wasm (sin hilos ni GPU).
for (const f of [
  'package.json',
  'dist/ort.node.min.mjs',
  'dist/ort-wasm-simd-threaded.mjs',
  'dist/ort-wasm-simd-threaded.wasm',
]) {
  const destino = path.join(out, 'node_modules/onnxruntime-web', f);
  await mkdir(path.dirname(destino), { recursive: true });
  await cp(path.join(ortWeb, f), destino);
}
await cp(ortCommon, path.join(out, 'node_modules/onnxruntime-common'), { recursive: true });
console.log('App compilada en', path.relative(process.cwd(), out));
