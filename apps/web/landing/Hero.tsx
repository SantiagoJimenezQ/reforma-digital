import Logo from './Logo';
import GithubIcon from './GithubIcon';
import { links, nav } from './site';

export default function Hero() {
  return (
    <>
      <section className="full-hero" aria-labelledby="hero-title">
        <div className="px-[clamp(16px,3vw,40px)]">
          <div className="flex h-[76px] items-center justify-between gap-6">
            <a
              href="/"
              className="no-underline [&_span:last-child]:!text-base"
              aria-label="Reforma Digital, inicio"
            >
              <Logo size={22} />
            </a>
            <nav className="flex items-center gap-3 sm:gap-[22px]" aria-label="Principal">
              {nav.map((item) => (
                <a
                  key={item.href}
                  className="text-sm text-ink-muted no-underline hover:text-ink max-sm:hidden"
                  href={item.href}
                >
                  {item.label}
                </a>
              ))}
              <a
                data-composer-link
                href="/"
                className="text-sm text-ink-muted no-underline hover:text-ink"
              >
                Buscador
              </a>
              <a
                className="inline-flex h-[38px] items-center gap-2 rounded-full bg-brand-900 px-4 text-sm font-medium text-white no-underline hover:bg-[#333] hover:text-white"
                href={links.repo}
              >
                <GithubIcon size={16} />
                <span className="max-sm:sr-only">Código fuente</span>
              </a>
            </nav>
          </div>

          <div className="pt-[clamp(40px,8vw,104px)] text-center">
            <h1
              id="hero-title"
              className="font-serif text-[clamp(56px,9vw,112px)] font-normal leading-[0.95] tracking-[-0.035em] text-ink"
            >
              Reforma Digital
            </h1>
            <p className="mx-0 mb-[clamp(40px,5vw,64px)] mt-[18px] text-[clamp(17px,1.6vw,20px)] text-ink-muted">
              La próxima reforma de la Administración, hecha en comunidad.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
