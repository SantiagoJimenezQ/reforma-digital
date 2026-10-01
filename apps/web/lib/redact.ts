export function redactQuery(q: string): string {
  return q
    .replace(/\b\d{8}[A-Z]\b/gi, '[DNI omitido]')
    .replace(/\b[XYZ]\d{7}[A-Z]\b/gi, '[NIE omitido]')
    .replace(/\bES\d{2}(?:\s?\d{4}){5}\b/gi, '[IBAN omitido]')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[correo omitido]')
    .replace(/\b[6789]\d{8}\b/g, '[teléfono omitido]');
}
