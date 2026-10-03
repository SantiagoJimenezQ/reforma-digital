import type { ReactNode } from 'react';
import Logo from './Logo';
import MobileNavigation from './MobileNavigation';
import GithubIcon from './GithubIcon';
import { links, nav } from './site';

export default function Hero({ composer }: { composer?: ReactNode }) {
  return (
    <section className="full-hero" aria-labelledby="hero-title">
      <div className="hero-bar">
        <a
          href="/"
          className="no-underline [&_span:last-child]:!text-base"
          aria-label="Reforma Digital, inicio"
        >
          <Logo size={22} />
        </a>
        <nav
          className="hero-desktop-nav flex items-center gap-3 sm:gap-[22px]"
          aria-label="Principal"
        >
          {nav.map((item) => (
            <a
              key={item.href}
              data-keep-mobile={item.mobile || undefined}
              className="text-sm text-ink-muted no-underline hover:text-ink"
              href={item.href}
            >
              {item.label}
            </a>
          ))}
          <a
            className="hero-repo inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full bg-brand-900 px-4 text-sm font-medium no-underline"
            href={links.repo}
          >
            <GithubIcon size={16} />
            <span className="max-sm:sr-only">Código fuente</span>
          </a>
        </nav>
        <MobileNavigation />
      </div>

      <div className="hero-body">
        <div className="hero-copy">
          <h1 id="hero-title">Reforma Digital</h1>
          <p className="hero-tagline">
            La próxima reforma de la Administración, hecha en comunidad.
          </p>
        </div>
        <div className="hero-scene">
          <div className="hero-photo" aria-hidden="true" />
          {composer}
          <p className="hero-lead">
            Un buscador de trámites con fuentes oficiales. Una extensión para las webs donde los
            haces. Una iniciativa abierta para que las dos cosas lleguen a las sedes.
          </p>
        </div>
        <a className="hero-install" href={links.install}>
          Descargar la extensión
        </a>
      </div>
    </section>
  );
}
