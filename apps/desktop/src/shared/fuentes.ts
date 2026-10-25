import type { Fuente, ItemConversacion } from './api';

/** El último texto de cada turno muestra sus fuentes al terminar o esperar a la persona. */
export function conFuentesDelTurno(
  conversacion: ItemConversacion[],
  fuentes: Fuente[],
  trabajando: boolean,
): ItemConversacion[] {
  const resultado = [...conversacion];
  const consultadas = new Map<string, Fuente>();
  let respuesta = -1;
  const terminar = () => {
    const item = conversacion[respuesta];
    if (item?.tipo === 'asistente' && !item.fuentes && consultadas.size)
      resultado[respuesta] = { ...item, fuentes: [...consultadas.values()] };
  };
  for (const [n, item] of conversacion.entries()) {
    if (item.tipo === 'usuario' && !item.redirigido) {
      terminar();
      consultadas.clear();
      respuesta = -1;
    }
    if (item.tipo === 'asistente') respuesta = n;
    if (item.tipo === 'pregunta') terminar();
    if (item.tipo !== 'actividad') continue;
    // Los historiales anteriores solo guardaban los IDs, ligados a la acción que los consultó.
    const lista =
      item.consultadas ??
      fuentes
        .filter((f) => item.fuentes?.includes(f.id))
        .map((f): Fuente => ({
          ...f,
          origen:
            item.herramienta === 'buscar' || item.herramienta === 'buscar_ley'
              ? 'busqueda'
              : 'pagina',
        }));
    for (const f of lista) {
      const previa = consultadas.get(f.id);
      consultadas.set(f.id, { ...f, origen: previa?.origen === 'pagina' ? 'pagina' : f.origen });
    }
  }
  if (!trabajando) terminar();
  return resultado;
}
