import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { safeStorage } from 'electron';

const CABECERA = Buffer.from('RDA1');

/**
 * Todo lo que la app guarda va cifrado con AES-256-GCM: perfil, trámites, conversaciones y la
 * clave del proveedor. La clave de datos es aleatoria y la protege el sistema mediante safeStorage
 * (llavero de macOS, DPAPI en Windows, GNOME Keyring o KWallet en Linux), así que los archivos no se
 * pueden leer fuera de esta cuenta de usuario.
 * El nombre del archivo forma parte de los datos autenticados: no se pueden intercambiar.
 */
export class Almacen {
  private constructor(
    private dir: string,
    private clave: Buffer,
  ) {}

  static async abrir(dir: string): Promise<Almacen> {
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    if (!(await safeStorage.isAsyncEncryptionAvailable()))
      throw new Error(
        'El llavero del sistema no está disponible: no se pueden proteger los datos.',
      );
    // Sin llavero, Linux protege la clave con una contraseña fija: sería como guardarla sin cifrar.
    if (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')
      throw new Error(
        'No hay ningún llavero para proteger los datos. Instala o desbloquea GNOME Keyring o KWallet y vuelve a abrir la app.',
      );
    const ruta = path.join(dir, 'clave.bin');
    let clave: Buffer;
    try {
      const { result } = await safeStorage.decryptStringAsync(await fs.readFile(ruta));
      clave = Buffer.from(result, 'base64');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      clave = randomBytes(32);
      await escribirAtomico(ruta, await safeStorage.encryptStringAsync(clave.toString('base64')));
    }
    if (clave.length !== 32) throw new Error('La clave de datos no es válida.');
    return new Almacen(dir, clave);
  }

  private ruta(nombre: string) {
    if (!/^[\w.-]+$/.test(nombre)) throw new Error('Nombre de archivo no válido');
    return path.join(this.dir, nombre);
  }

  async leer<T>(nombre: string): Promise<T | undefined> {
    let datos: Buffer;
    try {
      datos = await fs.readFile(this.ruta(nombre));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw e;
    }
    if (!datos.subarray(0, 4).equals(CABECERA))
      throw new Error(`${nombre} no tiene el formato esperado`);
    const iv = datos.subarray(4, 16);
    const tag = datos.subarray(16, 32);
    const descifrador = createDecipheriv('aes-256-gcm', this.clave, iv);
    descifrador.setAAD(Buffer.from(nombre));
    descifrador.setAuthTag(tag);
    const claro = Buffer.concat([descifrador.update(datos.subarray(32)), descifrador.final()]);
    return JSON.parse(claro.toString('utf8')) as T;
  }

  async escribir(nombre: string, valor: unknown) {
    const iv = randomBytes(12);
    const cifrador = createCipheriv('aes-256-gcm', this.clave, iv);
    cifrador.setAAD(Buffer.from(nombre));
    const cuerpo = Buffer.concat([
      cifrador.update(JSON.stringify(valor), 'utf8'),
      cifrador.final(),
    ]);
    await escribirAtomico(
      this.ruta(nombre),
      Buffer.concat([CABECERA, iv, cifrador.getAuthTag(), cuerpo]),
    );
  }

  async borrar(nombre: string) {
    await fs.rm(this.ruta(nombre), { force: true });
  }

  async lista(prefijo: string) {
    return (await fs.readdir(this.dir)).filter((f) => f.startsWith(prefijo));
  }

  /** Borra todo destruyendo antes la clave: lo que quede en disco ya no se puede descifrar. */
  async destruir() {
    await fs.rm(this.ruta('clave.bin'), { force: true });
    await fs.rm(this.dir, { recursive: true, force: true });
  }
}

async function escribirAtomico(ruta: string, datos: Buffer) {
  const tmp = `${ruta}.${randomBytes(4).toString('hex')}.tmp`;
  await fs.writeFile(tmp, datos, { mode: 0o600 });
  await fs.rename(tmp, ruta);
}
