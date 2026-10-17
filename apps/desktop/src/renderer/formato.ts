export const dolares = (n: number) =>
  `${n < 0.01 && n > 0 ? '<0,01' : n.toFixed(2).replace('.', ',')} $`;

export const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

/** Cuánto hace de una fecha, corto como en una lista: «ahora», «5 min», «3 h», «12 d», «2 meses». */
export const hace = (iso: string, ahora = Date.now()) => {
  const min = Math.floor((ahora - Date.parse(iso)) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `${min} min`;
  if (min < 60 * 24) return `${Math.floor(min / 60)} h`;
  if (min < 60 * 24 * 30) return `${Math.floor(min / (60 * 24))} d`;
  const meses = Math.floor(min / (60 * 24 * 30));
  return meses === 1 ? '1 mes' : `${meses} meses`;
};
