'use client';

import { useEffect, useRef } from 'react';
import { Menu } from 'lucide-react';
import GithubIcon from './GithubIcon';
import { links, nav } from './site';

export default function MobileNavigation() {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (menu.current?.open && !menu.current.contains(event.target as Node))
        menu.current.open = false;
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeWithEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeWithEscape);
    };
  }, []);
  return (
    <details ref={menu} className="hero-mobile-menu">
      <summary aria-label="Menú">
        <Menu size={24} aria-hidden="true" />
      </summary>
      <nav
        aria-label="Principal"
        onClick={(event) => {
          if ((event.target as Element).closest('a') && menu.current) menu.current.open = false;
        }}
      >
        {nav.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
        <a href={links.repo}>
          <GithubIcon size={16} /> Código fuente
        </a>
      </nav>
    </details>
  );
}
