import type { Step } from '@reforma-digital/design';

/** Pasos del servicio oficial «Asistencia y Cita» (pestañas de la aplicación, sept. 2026). */
export const STEPS: Step[] = [
  { id: 'servicio', label: 'Tipo de cita y servicio' },
  { id: 'paraquien', label: 'Para quién' },
  { id: 'paraque', label: 'Para qué' },
  { id: 'seleccion', label: 'Selección de cita' },
  { id: 'confirmacion', label: 'Confirmación' },
];

/** Desde «Para quién» la web oficial pide NIF y nombre: la extensión no interviene. */
export const OUT_OF_SCOPE_FROM = 'paraquien';
