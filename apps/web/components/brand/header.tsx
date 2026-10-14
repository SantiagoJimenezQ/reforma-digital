import { cn } from '@reforma-digital/design/lib/utils';
import { buttonVariants } from '@reforma-digital/design/ui/button';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from './icon';
import { Logo } from './logo';
import { MobileMenu } from './mobile-menu';

export function Header({
  current,
  action,
  className,
}: {
  current?: string;
  action?: ReactNode;
  className?: string;
}) {
  const links = [
    { href: '/#iniciativa', text: 'La iniciativa', current: false },
    { href: '/#proyectos', text: 'Proyectos', current: false },
    { href: '/congreso', text: 'El Congreso', current: current === '/congreso' },
    { href: '/api', text: 'API', current: current === '/api' },
    { href: '/equipo', text: 'Equipo', current: current === '/equipo' },
  ];

  return (
    <header
      className={cn(
        'in-nav flex items-center gap-4 min-h-20 [padding:16px_max(var(--page-gutter),_calc((100%_-_var(--container-content))_/_2_+_var(--page-gutter)))] [&_>_a]:flex [&_>_a]:items-center [&_>_a]:[margin-right:auto] [&_nav]:flex [&_nav]:items-center [&_nav]:gap-1 [&_.in-menu-boton]:hidden [@media(max-width:_640px)]:[&_nav]:hidden [@media(max-width:_640px)]:[&_.in-menu-boton]:inline-flex [view-transition-name:sol-cabecera]',
        className,
      )}
    >
      <Link href="/" aria-label="Reforma Digital, portada de la iniciativa">
        <Logo size={36} />
      </Link>
      <nav aria-label="Navegación principal">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.current ? 'page' : undefined}
            data-slot="button"
            data-variant="secondary"
            className={cn(buttonVariants({ variant: 'secondary' }))}
          >
            {link.text}
          </Link>
        ))}
        {!action && (
          <Link
            href="/#participar"
            data-slot="button"
            data-variant="outline"
            className={cn(buttonVariants({ variant: 'outline', className: 'text-foreground' }))}
          >
            Participar <Icon name="derecha" size={16} />
          </Link>
        )}
      </nav>
      {action}
      <MobileMenu links={links} />
    </header>
  );
}
