'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { Button } from '@reforma-digital/design/sol';
import { Icon } from './icon';
import { Logo } from './logo';

type MenuLink = { href: string; text: string; current: boolean };

// Menú de pantalla completa para móvil, en amarillo para no confundirse con el rojo de la web.
// <dialog> modal: Esc, foco atrapado y devuelto al cerrar.
export function MobileMenu({ links }: { links: readonly MenuLink[] }) {
  const menu = useRef<HTMLDialogElement>(null);
  const close = () => menu.current?.close();

  return (
    <>
      <Button
        variant="secondary"
        className="in-menu-boton"
        type="button"
        aria-label="Abrir el menú"
        aria-haspopup="dialog"
        onClick={() => menu.current?.showModal()}
      >
        <Icon name="mas" size={18} />
      </Button>
      <dialog ref={menu} className="in-menu" aria-label="Menú">
        <div className="in-menu-barra">
          <Link href="/" aria-label="Reforma Digital, portada de la iniciativa" onClick={close}>
            <Logo size={36} />
          </Link>
          <Button
            className="in-menu-boton in-menu-cerrar"
            type="button"
            aria-label="Cerrar el menú"
            onClick={close}
          >
            <Icon name="mas" size={18} />
          </Button>
        </div>
        <nav aria-label="Menú">
          {links.map(({ href, text, current }) => (
            <Link
              key={href}
              href={href}
              aria-current={current ? 'page' : undefined}
              onClick={close}
            >
              {text}
              <Icon name="derecha" size={18} />
            </Link>
          ))}
        </nav>
        <Button asChild className="in-menu-participar">
          <Link href="/#participar" onClick={close}>
            Participar <Icon name="derecha" size={16} />
          </Link>
        </Button>
      </dialog>
    </>
  );
}
