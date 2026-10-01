import Link from 'next/link';
import { ProjectBrand, ProjectFooter } from './project-header';
export function Header() {
  return (
    <>
      <div className="project-notice">
        Un proyecto independiente, sin vinculación con la Administración.
      </div>
      <header className="header project-header">
        <Link href="/" className="project-brand" aria-label="Reforma Digital, inicio">
          <ProjectBrand />
        </Link>
        <nav aria-label="Navegación principal">
          <Link href="/sources" className="nav-source">
            Nuestras fuentes
          </Link>
          <details className="menu">
            <summary>
              Menú <span>≡</span>
            </summary>
            <div>
              <Link href="/">Hacer una pregunta</Link>
              <Link href="/sources">Fuentes oficiales</Link>
              <Link href="/how-it-works">Cómo funciona</Link>
              <Link href="/privacy">Privacidad</Link>
              <Link href="/admin/evals">Evaluaciones ↗</Link>
            </div>
          </details>
        </nav>
      </header>
    </>
  );
}
export function Footer() {
  return <ProjectFooter />;
}
