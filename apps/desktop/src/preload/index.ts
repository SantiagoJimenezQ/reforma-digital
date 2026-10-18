import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { ApiRd, EventoApp } from '../shared/api';

const metodos = [
  'estado',
  'guardarAjustes',
  'probarConexion',
  'crearTramite',
  'ajustarTramite',
  'verTramite',
  'enviar',
  'quitarDeCola',
  'redirigir',
  'volver',
  'detener',
  'borrarTramite',
  'responder',
  'colocarNavegador',
  'navegar',
  'abrirEnTramite',
  'revelarPerfil',
  'guardarPerfil',
  'borrarDatos',
  'abrirEnlace',
  'mostrarArchivo',
] as const satisfies readonly Exclude<keyof ApiRd, 'on'>[];

const api = Object.fromEntries(
  metodos.map((m) => [m, (...args: unknown[]) => ipcRenderer.invoke('rd', m, ...args)]),
);

contextBridge.exposeInMainWorld('rd', {
  ...api,
  on(listener: (e: EventoApp) => void) {
    const l = (_e: IpcRendererEvent, evento: EventoApp) => listener(evento);
    ipcRenderer.on('rd:evento', l);
    return () => ipcRenderer.off('rd:evento', l);
  },
});
