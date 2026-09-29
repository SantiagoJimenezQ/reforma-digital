import { fieldByLabel, type FieldSpec } from '@reforma-digital/bridge';

export const knownLabels = [
  ['document', 'Número de Documento', ''],
  ['letter', 'Letra', ''],
  ['team', 'Equipo de Expedición', ''],
  ['expiry', 'Fecha de Validez', 'dd/mm/aaaa o PERMANENTE'],
  ['support', 'Número de Soporte', ''],
] as const;

export function identificationBindings(document: Document): Record<string, FieldSpec> | null {
  const fields: Record<string, FieldSpec> = {};
  for (const [id, label, help] of knownLabels) {
    const element = fieldByLabel(document, label);
    if (
      !element ||
      !(element instanceof HTMLInputElement) ||
      element.type !== 'text' ||
      !element.form
    )
      return null;
    if (
      ['onkeydown', 'onkeyup', 'onkeypress', 'onblur', 'onfocus', 'onpaste', 'onbeforeinput'].some(
        (attribute) => element.hasAttribute(attribute),
      )
    )
      return null;
    fields[id] = { element, label, help };
  }
  const form = fields.document!.element.form;
  return Object.values(fields).every(({ element }) => element.form === form) ? fields : null;
}
