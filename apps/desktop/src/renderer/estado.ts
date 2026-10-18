import { useSyncExternalStore } from 'react';
import type { EstadoApp, TramiteVista } from '../shared/api';

type Estado = { app: EstadoApp | null; tramites: Record<string, TramiteVista> };

let estado: Estado = { app: null, tramites: {} };
const oyentes = new Set<() => void>();
const fijar = (nuevo: Estado) => {
  estado = nuevo;
  for (const o of oyentes) o();
};

window.rd.on((e) => {
  if (e.tipo === 'estado') fijar({ ...estado, app: e.estado });
  if (e.tipo === 'tramite')
    fijar({ ...estado, tramites: { ...estado.tramites, [e.vista.id]: e.vista } });
});
void window.rd.estado().then((app) => fijar({ ...estado, app }));

/** Carga un trámite que aún no ha emitido cambios en esta sesión. */
export async function cargarTramite(id: string) {
  const v = await window.rd.verTramite(id);
  if (v) fijar({ ...estado, tramites: { ...estado.tramites, [id]: v } });
}

export const useEstado = () =>
  useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    () => estado,
  );
