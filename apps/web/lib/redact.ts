export const REDACTION_RULES = [
  [/\b\d{8}[A-Z]\b/gi, '[DNI omitido]'],
  [/\b[XYZ]\d{7}[A-Z]\b/gi, '[NIE omitido]'],
  [/\bES\d{2}(?:\s?\d{4}){5}\b/gi, '[IBAN omitido]'],
  [/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[correo omitido]'],
  [/\b[6789]\d{8}\b/g, '[teléfono omitido]'],
] as const;
export function redactQuery(q: string): string {
  return REDACTION_RULES.reduce((text, [pattern, marker]) => text.replace(pattern, marker), q);
}
