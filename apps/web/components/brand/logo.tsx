import { Logotipo } from '@reforma-digital/design/ui/logotipo';

// Logo: R con la esquina doblada. El cuerpo toma el color del texto; el doblez va en --doblez.
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={(size * 3) / 4} height={size} viewBox="0 0 144 192" aria-hidden="true">
      <path fill="var(--logo-color, currentColor)" d="M48 0H96V48H48V96H96V144H48V192H0V48H48Z" />
      <path fill="var(--brand-dark, #a50e0e)" d="M0 48L48 0V48Z" />
      <rect x="96" y="48" width="48" height="48" fill="var(--logo-color, currentColor)" />
      <rect x="96" y="144" width="48" height="48" fill="var(--logo-color, currentColor)" />
    </svg>
  );
}

// Logo completo: la R y «Reforma / Digital» en dos líneas, separados por un módulo (1/4 de la R).
// `size` es el alto de la R. El tamaño de letra solo fija las medidas en em de `.marca`.
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className={'marca inline-flex items-center [gap:0.5em]'} style={{ fontSize: size / 2 }}>
      <LogoMark size={size} />
      <span className={'marca-texto flex'}>
        <Logotipo size={size} />
      </span>
    </span>
  );
}
