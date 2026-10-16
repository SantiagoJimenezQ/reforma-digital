export const dolares = (n: number) =>
  `${n < 0.01 && n > 0 ? '<0,01' : n.toFixed(2).replace('.', ',')} $`;

export const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};
