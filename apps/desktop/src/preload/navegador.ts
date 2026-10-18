// Preload del navegador de cada trámite (también en sus marcos). Los alert, confirm y prompt de la
// web pasan por la app: el asistente los ve y los responde, y la persona también puede hacerlo.
// Electron los mostraría en un cuadro que el asistente no ve y que deja la página parada.
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld(
  '__rdDialogo',
  (tipo: string, mensaje: unknown, porDefecto: unknown) =>
    // Síncrono, como el diálogo original: la página espera a la respuesta.
    ipcRenderer.sendSync(
      'rd:dialogo',
      tipo,
      String(mensaje ?? ''),
      porDefecto == null ? null : String(porDefecto),
    ),
);

contextBridge.executeInMainWorld({
  func: () => {
    const dialogo: unknown = Reflect.get(window, '__rdDialogo');
    if (typeof dialogo !== 'function') return;
    const preguntar = (...a: unknown[]): unknown => dialogo(...a);
    window.alert = (mensaje?: unknown) => void preguntar('alert', mensaje);
    window.confirm = (mensaje?: string) => preguntar('confirm', mensaje) === true;
    window.prompt = (mensaje?: string, porDefecto?: string) => {
      const r = preguntar('prompt', mensaje, porDefecto);
      return typeof r === 'string' ? r : null;
    };
  },
});
