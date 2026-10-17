// Compila la app en out/: proceso principal (ESM, con sus dependencias dentro), preload (CommonJS,
// porque los preloads con sandbox no admiten ESM) e interfaz (React + sistema de diseño).
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, rm } from 'node:fs/promises';
import { builtinModules, createRequire } from 'node:module';
import path from 'node:path';
import { designPostcss } from '@reforma-digital/design/postcss';

const raiz = path.resolve(import.meta.dirname, '..');
const repo = path.resolve(raiz, '../..');
const out = path.join(raiz, 'out');
// ONNX Runtime es nativo: va aparte, en out/node_modules, con solo el binario de este Mac.
const externos = [
  'electron',
  'onnxruntime-node',
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
    // La clave del asistente va dentro de la app compilada (ver CLAVE_GATEWAY en src/main/index.ts).
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.CLAVE_GATEWAY': JSON.stringify(process.env.AI_GATEWAY_API_KEY ?? ''),
      'process.env.CLAVE_NAN': JSON.stringify(process.env.NAN_API_KEY ?? ''),
      'process.env.CLAVE_EXA': JSON.stringify(process.env.EXA_API_KEY ?? ''),
    },
    ssr: { noExternal: true },
    resolve: { alias: { sharp: path.join(raiz, 'src/main/sin-imagenes.ts') } },
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
// El detector de datos personales: el modelo (pnpm --filter @reforma-digital/agent detector lo
// descarga y comprueba su huella) y ONNX Runtime, el mismo que usa transformers.js.
const modelo = path.join(repo, 'packages/agent/.cache/rampart');
if (existsSync(modelo)) await cp(modelo, path.join(out, 'modelos/rampart'), { recursive: true });
else
  console.warn(
    'Falta el modelo del detector: sin él, la app no enviará nada al asistente. Descárgalo con pnpm --filter @reforma-digital/agent detector.',
  );
const transformers = createRequire(path.join(repo, 'packages/agent/package.json')).resolve(
  '@huggingface/transformers',
);
const ortNode = path.dirname(createRequire(transformers).resolve('onnxruntime-node/package.json'));
const ortCommon = path.resolve(
  createRequire(ortNode + '/').resolve('onnxruntime-common'),
  '../../..',
);
const binario = `bin/napi-v6/${process.platform}/${process.arch}`;
for (const f of [
  'package.json',
  'dist',
  `${binario}/onnxruntime_binding.node`,
  `${binario}/libonnxruntime.1.dylib`,
]) {
  const destino = path.join(out, 'node_modules/onnxruntime-node', f);
  await mkdir(path.dirname(destino), { recursive: true });
  await cp(path.join(ortNode, f), destino, { recursive: true });
}
await cp(ortCommon, path.join(out, 'node_modules/onnxruntime-common'), { recursive: true });
// La extensión de Reforma Digital: la app la carga en el navegador de los trámites si la persona
// activa las interfaces comunitarias en Ajustes.
execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: repo, stdio: 'ignore' });
await cp(path.join(repo, 'dist'), path.join(out, 'extension'), { recursive: true });
console.log('App compilada en', path.relative(process.cwd(), out));
