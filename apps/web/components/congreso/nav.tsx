'use client';
import { Disclosure, Button } from '@reforma-digital/design/sol';
import { Icon } from '../sol/icon';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { congressBase, congressSections } from '../../lib/congreso/routes';

// Cada ficha mantiene marcada la vista de la que sale.
const parents: Record<string, string> = {
  votacion: 'votaciones',
  sesion: 'dias',
  iniciativa: 'leyes',
  tema: 'temas',
  diputado: 'diputados',
  cargo: 'organigrama',
};

// Las vistas de El Congreso, dos veces con los mismos enlaces: la barra con desplegables, para pantallas
// estrechas, y la columna con todas a la vista. El CSS enseña una u otra (DESIGN.md §8.7).
export function CongressNav() {
  const section =
    usePathname()
      .slice(congressBase.length + 1)
      .split('/')[0] ?? '';
  const view = parents[section] ?? section;
  const links = (pages: string[][]) =>
    pages.map(([title, path]) => {
      const href = path ? `${congressBase}/${path}` : congressBase;
      const current = path === view;
      return (
        <li key={path}>
          <Button asChild variant="ghost">
            <Link href={href} aria-current={current ? 'page' : undefined}>
              {title}
            </Link>
          </Button>
        </li>
      );
    });

  return (
    <>
      <nav className="cg-nav" aria-label="Secciones del Congreso">
        <Link className="cg-brand" href={congressBase}>
          El Congreso
        </Link>
        {congressSections.map((section) => (
          <Disclosure
            key={section.title}
            title={section.title}
            icon={<Icon name="abajo" size={16} />}
          >
            <ul className="caja-flota">{links(section.pages)}</ul>
          </Disclosure>
        ))}
      </nav>
      <nav className="cg-lateral" aria-label="Secciones del Congreso">
        {congressSections.map((section, i) => (
          <div key={section.title}>
            {i > 0 && <h2 className="t-etiqueta">{section.title}</h2>}
            <ul>{links(section.pages)}</ul>
          </div>
        ))}
      </nav>
    </>
  );
}
