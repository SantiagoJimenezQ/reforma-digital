import type { Step } from '@better-government/design';

/** Pasos del flujo oficial tal y como se observaron en la web (sept. 2026). */
export const STEPS: Step[] = [
  { id: 'landing', label: 'Información del trámite' },
  { id: 'provincias', label: 'Provincia' },
  { id: 'tramites', label: 'Oficina y trámite' },
  { id: 'info', label: 'Requisitos y forma de acceso' },
  { id: 'reserva', label: 'Tus datos y la cita' },
];

/** Desde este paso la extensión no interviene: datos personales y reserva. */
export const OUT_OF_SCOPE_FROM = 'reserva';
