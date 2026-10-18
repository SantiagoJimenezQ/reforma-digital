// Iconos de Sol: Nucleo UI Essential outline 18 (DESIGN.md §8.2). Decorativos: el texto o el
// aria-label del control que los contiene da el nombre.
import type { ComponentType } from 'react';
import {
  IconCalendarOutline18,
  IconCheckOutline18,
  IconChevronDownOutline18,
  IconChevronLeftOutline18,
  IconChevronRightOutline18,
  IconCircleInfoOutline18,
  IconFileContentOutline18,
  IconFingerprintOutline18,
  IconFolderOpenOutline18,
  IconGear2Outline18,
  IconGlobePointerOutline18,
  IconHandOutline18,
  IconLinkOutline18,
  IconLockOutline18,
  IconMagnifierOutline18,
  IconPlusOutline18,
  IconRefresh2Outline18,
  IconShieldCheckOutline18,
  IconTrashOutline18,
  IconTriangleWarningOutline18,
  IconUserOutline18,
  IconXmarkOutline18,
  IconEyeOpenOutline18,
} from 'nucleo-ui-essential-outline-18';

type Svg = ComponentType<{ size?: number; className?: string; 'aria-hidden'?: true }>;

// Nucleo no trae «detener» ni flechas rectas: mismas proporciones sobre la rejilla de 18.
function Detener({ size, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" className={className} aria-hidden="true">
      <rect x="4.5" y="4.5" width="9" height="9" rx="2" fill="currentColor" />
    </svg>
  );
}
function FlechaArriba({ size, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" className={className} aria-hidden="true">
      <path
        d="M9 15V3.5M4 8.25 9 3.25l5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const iconos = {
  calendario: IconCalendarOutline18,
  check: IconCheckOutline18,
  abajo: IconChevronDownOutline18,
  atras: IconChevronLeftOutline18,
  siguiente: IconChevronRightOutline18,
  info: IconCircleInfoOutline18,
  documento: IconFileContentOutline18,
  huella: IconFingerprintOutline18,
  carpeta: IconFolderOpenOutline18,
  ajustes: IconGear2Outline18,
  web: IconGlobePointerOutline18,
  mano: IconHandOutline18,
  enlace: IconLinkOutline18,
  candado: IconLockOutline18,
  buscar: IconMagnifierOutline18,
  mas: IconPlusOutline18,
  recargar: IconRefresh2Outline18,
  escudo: IconShieldCheckOutline18,
  papelera: IconTrashOutline18,
  aviso: IconTriangleWarningOutline18,
  persona: IconUserOutline18,
  cerrar: IconXmarkOutline18,
  ver: IconEyeOpenOutline18,
  detener: Detener,
  enviar: FlechaArriba,
} satisfies Record<string, Svg>;

export type NombreIcono = keyof typeof iconos;

export function Icono({
  nombre,
  size = 18,
  className,
}: {
  nombre: NombreIcono;
  size?: number;
  className?: string;
}) {
  const Svg: Svg = iconos[nombre];
  return <Svg size={size} aria-hidden className={className ? `icono ${className}` : 'icono'} />;
}

/** La R de esquina doblada del logotipo. */
export function Marca({ size = 22 }: { size?: number }) {
  return (
    <svg width={(size * 3) / 4} height={size} viewBox="0 0 144 192" aria-hidden="true">
      <path fill="var(--brand)" d="M48 0H96V48H48V96H96V144H48V192H0V48H48Z" />
      <path fill="var(--brand-dark)" d="M0 48L48 0V48Z" />
      <rect x="96" y="48" width="48" height="48" fill="var(--brand)" />
      <rect x="96" y="144" width="48" height="48" fill="var(--brand)" />
    </svg>
  );
}
