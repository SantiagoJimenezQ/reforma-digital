// Descarga el modelo del detector de datos personales (Rampart, CC BY 4.0) en .cache/rampart.
// Versión fija y huella SHA-256 de cada archivo: si algo no coincide, no se guarda.
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REVISION = 'b1993e4e68b082835b80ffc65acc03325ea2e501';
const ARCHIVOS = {
  'config.json': '003b84bbcd489f5e782fe5cad8f3249c3653ec880089abb1ccc398a0d895e3e6',
  'tokenizer.json': '98ade711428b42a1b5343c403a73344535e92de8e19359cdb567ef34da210259',
  'tokenizer_config.json': '0088a6f8bcdd4014184fb068b83ebb12896a9db2bb269a71f73de83fef24bceb',
  'onnx/model_q4.onnx': '9f27d24949b0581701071ea5ef522d77ccd3f50c525cc91eac4d265b0fc2afe5',
  LICENSE: '57fec6ca5de5e18ced1a10b36c87c0988fdc170f03f73e8ae2f20f5de42a884e',
};
const destino = path.resolve(import.meta.dirname, '../.cache/rampart');
const huella = (datos) => createHash('sha256').update(datos).digest('hex');

for (const [archivo, sha] of Object.entries(ARCHIVOS)) {
  const ruta = path.join(destino, archivo);
  const previo = await readFile(ruta).catch(() => null);
  if (previo && huella(previo) === sha) continue;
  const url = `https://huggingface.co/nationaldesignstudio/rampart/resolve/${REVISION}/${archivo}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se ha podido descargar ${archivo}: HTTP ${res.status}`);
  const datos = Buffer.from(await res.arrayBuffer());
  if (huella(datos) !== sha) throw new Error(`${archivo} no tiene la huella esperada`);
  await mkdir(path.dirname(ruta), { recursive: true });
  await writeFile(`${ruta}.tmp`, datos);
  await rename(`${ruta}.tmp`, ruta);
}
console.log('Detector de datos personales en', path.relative(process.cwd(), destino));
