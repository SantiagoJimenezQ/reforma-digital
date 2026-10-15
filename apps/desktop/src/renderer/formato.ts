import type { ResumenTramite } from '../shared/api';

export const ETIQUETA_ESTADO: Record<ResumenTramite['estado'], string> = {
  investigando: 'Investigando',
  necesita_datos: 'Necesita tus datos',
  listo: 'Listo para empezar',
  en_curso: 'En curso',
  esperando: 'Esperando respuesta',
  completado: 'Completado',
  no_viable: 'No se puede hacer',
};

export const dolares = (n: number) =>
  `${n < 0.01 && n > 0 ? '<0,01' : n.toFixed(2).replace('.', ',')} $`;

export const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};
