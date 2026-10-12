import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from './icon';
import { Logo } from './logo';
import { MobileMenu } from './mobile-menu';
import './header.css';

export function Header({ current, action }: { current?: string; action?: ReactNode }) {
  const links = [
    { href: '/#iniciativa', text: 'La iniciativa', current: false },
    { href: '/#proyectos', text: 'Proyectos', current: false },
    { href: '/equipo', text: 'Equipo', current: current === '/equipo' },
  ];

  return (
    <header className="in-nav">
      <Link href="/" aria-label="Reforma Digital, portada de la iniciativa">
        <Logo size={36} />
      </Link>
      <nav aria-label="Navegación principal">
        {links.map((link) => (
          <Link
            key={link.href}
            className="boton-fantasma"
            href={link.href}
            aria-current={link.current ? 'page' : undefined}
          >
            {link.text}
          </Link>
        ))}
        {!action && (
          <Link className="boton-claro" href="/#participar">
            Participar <Icon name="derecha" size={16} />
          </Link>
        )}
      </nav>
      {action}
      <MobileMenu links={links} />
    </header>
  );
}
