import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';

export { Select } from './select';
export { Checkbox } from './checkbox';

/**
 * Controles y composición de Sol (GUIA.md). Reutilizan los estilos compartidos y
 * delegan las props y la ref al elemento correspondiente.
 */

const variants = {
  primary: 'boton',
  secondary: 'boton-claro',
  ghost: 'boton-fantasma',
  icon: 'boton-icono',
  send: 'boton-enviar',
} as const;

const join = (base: string, extra: string | undefined) => (extra ? `${base} ${extra}` : base);

/** Con `href` es un `<a>` (navegar); sin él, un `<button>` (actuar). */
type ButtonProps = (
  | (ComponentPropsWithRef<'button'> & { href?: never })
  | (ComponentPropsWithRef<'a'> & { href: string })
) &
  (
    | { variant?: 'primary' | 'secondary' | 'ghost' }
    | { variant: 'icon' | 'send'; 'aria-label': string }
  ) & { asChild?: boolean };

export function Button({ variant = 'primary', className, asChild = false, ...props }: ButtonProps) {
  const classes = join(variants[variant], className);
  if (asChild) return <Slot className={classes} {...props} />;
  return props.href === undefined ? (
    <button className={classes} {...props} />
  ) : (
    <a className={classes} {...props} />
  );
}

export function Field({ className, ...props }: ComponentPropsWithRef<'input'>) {
  return <input className={join('campo', className)} {...props} />;
}

export function Actions({ className, ...props }: ComponentPropsWithRef<'div'>) {
  return <div className={join('sol-actions', className)} {...props} />;
}

export function Tabs({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav className="sol-tabs" aria-label={label}>
      {children}
    </nav>
  );
}

export function Surface({
  tone = 'plain',
  asChild = false,
  className,
  ...props
}: ComponentPropsWithRef<'div'> & { tone?: 'plain' | 'muted'; asChild?: boolean }) {
  const classes = join(tone === 'plain' ? 'caja-plana' : 'caja-gris', className);
  return asChild ? <Slot className={classes} {...props} /> : <div className={classes} {...props} />;
}

export function Disclosure({
  title,
  icon,
  children,
  className,
  ...props
}: Omit<ComponentPropsWithRef<'details'>, 'title'> & { title: ReactNode; icon: ReactNode }) {
  return (
    <details className={join('sol-disclosure', className)} {...props}>
      <summary>
        <span>{title}</span>
        <span className="sol-disclosure-chevron" aria-hidden="true">
          {icon}
        </span>
      </summary>
      {children}
    </details>
  );
}

export function TextLink({ className, ...props }: ComponentPropsWithRef<'a'>) {
  return <a className={join('enlace', className)} {...props} />;
}
