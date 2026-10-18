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
// ONNX Runtime es nativo: va aparte, en out/node_modules, con solo el binario de este sistema.
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
    // La app no lleva claves: habla con el servidor de Reforma Digital (ver SERVIDOR en src/main/index.ts).
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.RD_SERVIDOR': JSON.stringify(process.env.RD_SERVIDOR ?? ''),
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
// El binding y la librería que carga (en macOS hay otra copia igual con la versión completa en el
// nombre). En Windows, DirectML y los dx*.dll solo se cargan si se pide la GPU; el detector usa CPU.
const libreria = {
  darwin: 'libonnxruntime.1.dylib',
  linux: 'libonnxruntime.so.1',
  win32: 'onnxruntime.dll',
}[process.platform];
const archivos = ['package.json', 'dist'];
if (existsSync(path.join(ortNode, binario)))
  archivos.push(`${binario}/onnxruntime_binding.node`, `${binario}/${libreria}`);
else
  console.warn(
    `ONNX Runtime no trae binarios para ${process.platform}-${process.arch} (los Mac con Intel, por ejemplo): sin el detector, la app no enviará nada al asistente.`,
  );
for (const f of archivos) {
  const destino = path.join(out, 'node_modules/onnxruntime-node', f);
  await mkdir(path.dirname(destino), { recursive: true });
  await cp(path.join(ortNode, f), destino, { recursive: true });
}
await cp(ortCommon, path.join(out, 'node_modules/onnxruntime-common'), { recursive: true });
console.log('App compilada en', path.relative(process.cwd(), out));
