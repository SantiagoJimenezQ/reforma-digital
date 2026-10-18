import { createHmac } from 'node:crypto';
import { connection, databaseAvailable } from '@reforma-digital/db';
import { CABECERA_INSTALACION } from '@reforma-digital/agent/models';

/**
 * El servidor de la app de escritorio guarda las claves del modelo (NaN Builders) y del buscador
 * (Exa): una app que se reparte no puede guardar secretos. Lo que impide el abuso son estos
 * límites, por instalación y por IP, y un presupuesto diario para todas.
 */
export const LIMITES = {
  /** Peticiones al modelo por instalación y hora: un turno que hace un trámite da hasta 25 pasos. */
  modelo: 150,
  /** Búsquedas por instalación y hora. */
  busqueda: 60,
  /** Peticiones por IP y hora, para muchas instalaciones desde el mismo sitio. */
  ip: 600,
  /** Gasto máximo al día entre todas las instalaciones, en dólares. */
  usdAlDia: 5,
};

type Ventana = 'hour' | 'day';
const DURACION: Record<Ventana, number> = { hour: 3_600_000, day: 86_400_000 };
const memoria = new Map<string, { inicio: number; cuenta: number }>();

/**
 * Suma `cuanto` al contador de la ventana en curso (la hora o el día, en UTC) y devuelve el total.
 * En Postgres si lo hay; si no (en local), en memoria.
 */
async function sumar(clave: string, ventana: Ventana, cuanto: number): Promise<number> {
  if (databaseAvailable()) {
    const filas = await connection()`INSERT INTO request_buckets(key, window_start, count)
      VALUES (${clave}, date_trunc(${ventana}, now()), ${cuanto})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN request_buckets.window_start < date_trunc(${ventana}, now())
          THEN ${cuanto} ELSE request_buckets.count + ${cuanto} END,
        window_start = date_trunc(${ventana}, now())
      RETURNING count`;
    return Number(filas[0]?.count);
  }
  const inicio = Math.floor(Date.now() / DURACION[ventana]) * DURACION[ventana];
  const fila = memoria.get(clave);
  const cuenta = (fila?.inicio === inicio ? fila.cuenta : 0) + cuanto;
  memoria.set(clave, { inicio, cuenta });
  return cuenta;
}

/**
 * El contador de algo sin guardarlo tal cual (ni la IP ni el identificador de la instalación). La
 * clave del proveedor hace de secreto: está siempre que el servidor funciona y no sale de él.
 */
const contador = (tipo: string, valor: string) =>
  `escritorio:${tipo}:${createHmac('sha256', process.env.NAN_API_KEY ?? '')
    .update(valor)
    .digest('hex')}`;

/** El gasto se cuenta en millonésimas de dólar: el contador es un entero. */
const GASTO = 'escritorio:gasto';
export const apuntarGasto = async (usd: number) => {
  if (usd > 0) await sumar(GASTO, 'day', Math.round(usd * 1e6));
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Antes de pasar una petición: la instalación tiene que identificarse y estar dentro de sus
 * límites, y el presupuesto del día no puede estar agotado. Devuelve la respuesta de rechazo, o
 * `null` si se puede pasar.
 */
export async function rechazo(
  request: Request,
  uso: 'modelo' | 'busqueda',
): Promise<Response | null> {
  const instalacion = request.headers.get(CABECERA_INSTALACION) ?? '';
  if (!UUID.test(instalacion))
    return Response.json({ error: 'Falta la instalación de la app.' }, { status: 400 });
  // La cabecera de IP solo es fiable en Vercel; fuera, todas cuentan juntas.
  const ip = process.env.VERCEL
    ? (request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ?? 'desconocida')
    : 'local';
  const saturado = Response.json(
    { error: 'Has hecho muchas peticiones. Espera un rato y vuelve a intentarlo.' },
    { status: 429 },
  );
  if ((await sumar(contador('ip', ip), 'hour', 1)) > LIMITES.ip) return saturado;
  if ((await sumar(contador(uso, instalacion), 'hour', 1)) > LIMITES[uso]) return saturado;
  if ((await sumar(GASTO, 'day', 0)) >= LIMITES.usdAlDia * 1e6)
    return Response.json(
      { error: 'El asistente ha llegado a su límite de hoy. Vuelve a intentarlo mañana.' },
      { status: 429 },
    );
  return null;
}

/** Lee el cuerpo sin pasar de `max` bytes; `null` si es más grande. */
export async function leerCuerpo(request: Request, max: number) {
  if (Number(request.headers.get('content-length') ?? 0) > max) return null;
  const texto = await request.text();
  return Buffer.byteLength(texto) > max ? null : texto;
}
