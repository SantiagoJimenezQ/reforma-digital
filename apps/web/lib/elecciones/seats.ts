// Puntos del bloque de los 350 (port de site/elecciones.js de Escaño Abierto, licencia MIT).
export const seatRadius = 6.2;
const gap = seatRadius * 2 + 1.6;

type Centre = { x: number; y: number };

// Un círculo por provincia, de área proporcional a sus escaños, empujado hasta que no se solapen
// (cartograma de Dorling) y atraído hacia su sitio en el mapa. Determinista: mismas iteraciones.
export function clusters(
  seats: Record<string, number>,
  centres: Record<string, [number, number]>,
): Record<string, Centre> {
  const nodes = Object.entries(seats)
    .filter(([id, n]) => n && centres[id])
    .map(([id, n]) => {
      const [x, y] = centres[id] ?? [0, 0];
      return { id, n, x, y, x0: x, y0: y, r: (Math.sqrt(n / 0.86) * gap) / 2 + 2 };
    });
  for (let it = 0; it < 260; it++) {
    for (const a of nodes) {
      a.x += (a.x0 - a.x) * 0.06;
      a.y += (a.y0 - a.y) * 0.06;
    }
    for (const [i, a] of nodes.entries())
      for (const b of nodes.slice(i + 1)) {
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const min = a.r + b.r + 1.5;
        if (d >= min) continue;
        const k = (min - d) / d / 2;
        dx *= k;
        dy *= k;
        const wa = b.n / (a.n + b.n);
        const wb = a.n / (a.n + b.n);
        a.x -= dx * wa;
        a.y -= dy * wa;
        b.x += dx * wb;
        b.y += dy * wb;
      }
  }
  return Object.fromEntries(nodes.map(({ id, x, y }) => [id, { x, y }]));
}

// Espiral de Fermat (girasol), ordenada de izquierda a derecha para colocar los grupos.
export function sunflower(n: number): Centre[] {
  if (n === 1) return [{ x: 0, y: 0 }];
  const c = gap * 0.53;
  const angle = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, k) => ({
    x: c * Math.sqrt(k + 0.5) * Math.cos(k * angle),
    y: c * Math.sqrt(k + 0.5) * Math.sin(k * angle),
  })).sort((a, b) => a.x - b.x || a.y - b.y);
}
