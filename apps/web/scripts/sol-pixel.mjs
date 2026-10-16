// Dibuja los soles pixelados de El Congreso (DESIGN.md §8.7): el atardecer de Sol tramado a tres tintas.
// Un píxel de la imagen es una celda; el CSS la amplía con `image-rendering: pixelated`. Fuera del sol es
// transparente. Cada dibujo solo depende de sus números: la misma entrada da el mismo PNG.
//
//   node apps/web/scripts/sol-pixel.mjs
import { writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';

const HUNDIDO = 4; // el centro del sol queda estas celdas por debajo del borde
// Del centro hacia fuera: --rojo, --naranja, --amarillo y nada. Cada parada es donde termina su tinta.
const TINTAS = [
  [223, 23, 23, 255],
  [255, 122, 26, 255],
  [255, 190, 11, 255],
  [0, 0, 0, 0],
];
const PARADAS = [0.4, 0.64, 0.84, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; // tramado ordenado 4 × 4

function trozo(tipo, datos) {
  const cuerpo = Buffer.concat([Buffer.from(tipo), datos]);
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const suma = Buffer.alloc(4);
  suma.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, suma]);
}

function sol(nombre, ancho, alto, radioX, radioY) {
  const filas = Buffer.alloc(alto * (1 + ancho * 4)); // cada fila empieza con su byte de filtro (0)
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const t = Math.hypot((x + 0.5 - ancho / 2) / radioX, (alto + HUNDIDO - y - 0.5) / radioY);
      let tinta = PARADAS.findIndex((parada) => t < parada);
      if (tinta < 0) tinta = 3;
      // Entre dos paradas, la trama decide celda a celda si se queda la tinta de dentro.
      if (tinta > 0 && t < 1) {
        const tramo = (t - PARADAS[tinta - 1]) / (PARADAS[tinta] - PARADAS[tinta - 1]);
        if (tramo <= (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16) tinta--;
      }
      filas.set(TINTAS[tinta], y * (1 + ancho * 4) + 1 + x * 4);
    }
  }
  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(ancho, 0);
  cabecera.writeUInt32BE(alto, 4);
  cabecera.set([8, 6, 0, 0, 0], 8); // 8 bits por canal, RGBA
  const destino = new URL(`../public/congreso/${nombre}.png`, import.meta.url);
  writeFileSync(
    destino,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      trozo('IHDR', cabecera),
      trozo('IDAT', deflateSync(filas, { level: 9 })),
      trozo('IEND', Buffer.alloc(0)),
    ]),
  );
  console.log(`${ancho} × ${alto} celdas → ${destino.pathname}`);
}

sol('sol-horizonte', 360, 32, 124, 34); // la portada: un arco bajo y ancho
sol('sol-disco', 120, 44, 58, 46); // las cabeceras: un sol que asoma
