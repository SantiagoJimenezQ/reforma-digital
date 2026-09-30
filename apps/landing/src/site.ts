const repo = 'https://github.com/samuelcorsan/reforma-digital';

export const links = {
  repo,
  architecture: `${repo}/blob/main/docs/ARCHITECTURE.md`,
  design: `${repo}/blob/main/DESIGN.md`,
  contributing: `${repo}/blob/main/CONTRIBUTING.md`,
  security: `${repo}/blob/main/SECURITY.md`,
  license: `${repo}/blob/main/LICENSE`,
  hacienda: `${repo}/tree/main/sites/hacienda`,
  extranjeria: `${repo}/tree/main/sites/extranjeria`,
  dni: `${repo}/tree/main/sites/dni`,
};

export const nav = [
  { href: '#texto', label: 'El texto' },
  { href: '#horizonte', label: 'Hoja de ruta' },
  { href: '#participar', label: 'Participar' },
];

/** Pasos de la aplicación oficial «Asistencia y Cita» de la Agencia Tributaria (sept. 2026). */
export const pasos = [
  'Tipo de cita y servicio',
  'Para quién',
  'Para qué',
  'Selección de cita',
  'Confirmación',
];

/** Normaliza para buscar sin tildes ni arrobas: «clave» encuentra «Cl@ve». */
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/@/g, 'a')
    .toLowerCase();
