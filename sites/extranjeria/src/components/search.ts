import { normalizedLabel } from '@reforma-digital/bridge';

/** Búsqueda sin tildes ni mayúsculas, por palabras: "cadiz" encuentra "Cádiz". */
export function matchesQuery(label: string, query: string): boolean {
  const q = normalizedLabel(query);
  if (!q) return true;
  const l = normalizedLabel(label);
  return q.split(/\s+/).every((word) => l.includes(word));
}
