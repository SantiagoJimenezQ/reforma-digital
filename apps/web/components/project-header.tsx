import Link from 'next/link';
import { ArrowUpRight, Github } from 'lucide-react';
import { links } from '../landing/site';

export function ProjectBrand() {
  return (
    <>
      <svg
        width="26"
        height="26"
        viewBox="0 0 32 32"
        aria-hidden="true"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <path d="M16 3.5 28 10l-12 6.5L4 10z" fill="currentColor" />
        <path
          d="m4 15.5 12 6.5 12-6.5M4 21.5 16 28l12-6.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <span>Reforma Digital</span>
    </>
  );
}
export function ProjectHeader() {
  return (
    <>
      <div className="project-notice">
        Un proyecto independiente, sin vinculación con la Administración.
      </div>
      <header className="project-header">
        <Link href="/" className="project-brand" aria-label="Reforma Digital, inicio">
          <ProjectBrand />
        </Link>
        <nav aria-label="Navegación principal">
          <a href="/#iniciativa">La iniciativa</a>
          <a href={links.repo} className="project-github" aria-label="Código en GitHub">
            <Github size={17} />
            <span>GitHub</span>
          </a>
        </nav>
      </header>
    </>
  );
}
export function ProjectFooter() {
  return (
    <footer className="project-footer">
      <div className="project-footer-top">
        <Link href="/" className="project-brand" aria-label="Reforma Digital, inicio">
          <ProjectBrand />
        </Link>
        <nav aria-label="Información del proyecto">
          <Link href="/#iniciativa">La propuesta</Link>
          <Link href="/sources">Fuentes oficiales</Link>
          <Link href="/privacy">Privacidad</Link>
          <a href={links.repo}>
            GitHub <ArrowUpRight size={13} />
          </a>
        </nav>
      </div>
      <div className="project-footer-bottom">
        <p>Hecho en comunidad. Para lo que nos pertenece a todos.</p>
        <p>Proyecto independiente · Código abierto · Licencia MIT</p>
      </div>
    </footer>
  );
}
