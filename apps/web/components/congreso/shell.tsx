import type { ReactNode } from 'react';
import Link from 'next/link';
import { Header } from '../sol/header';
import { Footer } from '../sol/footer';
import { congressBase, congressSections } from '../../lib/congreso/routes';
import './congreso.css';

export function CongressShell({ children }: { children: ReactNode }) {
  return (
    <div className="cg">
      <Header />
      <nav className="cg-nav" aria-label="Secciones del Congreso">
        <Link className="cg-brand" href={congressBase}>
          El Congreso
        </Link>
        {congressSections.map((section) => (
          <details key={section.title}>
            <summary>{section.title}</summary>
            <ul>
              {section.pages.map(([title, path]) => (
                <li key={path}>
                  <Link href={`${congressBase}/${path}`}>{title}</Link>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </nav>
      {children}
      <Footer />
    </div>
  );
}
