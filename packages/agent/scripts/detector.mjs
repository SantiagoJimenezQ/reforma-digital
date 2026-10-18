// Descarga el modelo del detector de datos personales (Rampart Edge, CC0) en .cache/rampart-edge.
// Versión fija y huella SHA-256 de cada archivo: si algo no coincide, no se guarda.
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REVISION = '69a99a3f0d3cbdb8db11f2ac97899f654be109bf';
const ARCHIVOS = {
  'config.json': '01e20d1a4acb7af422d9182c8d3ff2d506c6cd6b0ca26bead3697f5e380ae00a',
  'vocab.txt': 'ee0684683c7fb15744d0136e671cd7def76ae4d4ddafb72ced864e94c8d32c9a',
  'onnx/model_q4.onnx': '73fce00c229d8318d7e1f8decccc5ad2dbf7aa45a872364b54d632c38a9eb16c',
  LICENSE: 'a2010f343487d3f7618affe54f789f5487602331c0a8d03f49e9a7c547cf0499',
};
const destino = path.resolve(import.meta.dirname, '../.cache/rampart-edge');
const huella = (datos) => createHash('sha256').update(datos).digest('hex');

for (const [archivo, sha] of Object.entries(ARCHIVOS)) {
  const ruta = path.join(destino, archivo);
  const previo = await readFile(ruta).catch(() => null);
  if (previo && huella(previo) === sha) continue;
  const url = `https://huggingface.co/nationaldesignstudio/rampart-edge/resolve/${REVISION}/${archivo}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se ha podido descargar ${archivo}: HTTP ${res.status}`);
  const datos = Buffer.from(await res.arrayBuffer());
  if (huella(datos) !== sha) throw new Error(`${archivo} no tiene la huella esperada`);
  await mkdir(path.dirname(ruta), { recursive: true });
  await writeFile(`${ruta}.tmp`, datos);
  await rename(`${ruta}.tmp`, ruta);
}
console.log('Detector de datos personales en', path.relative(process.cwd(), destino));
