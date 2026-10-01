import { Fragment } from 'react';

import Logo from './Logo';
import { authors, links } from './site';

export default function Footer() {
  return (
    <>
      <footer className="border-t border-line py-10">
        <div className="mx-auto flex w-full max-w-page flex-wrap items-center justify-between gap-x-8 gap-y-4 px-[var(--gutter)]">
          <Logo size={26} />
          <p className="max-w-[60ch] text-sm text-ink-subtle">
            Proyecto independiente y comunitario, sin vinculación con la Administración. Los
            trámites se completan siempre en la web oficial.
          </p>
          <div className="grid gap-1 text-sm text-ink-subtle">
            <p>
              <a href={links.license}>Licencia MIT</a> · 2026
            </p>
            <p>
              Made by{' '}
              {authors.map((author, index) => (
                <Fragment key={author.href}>
                  {index === authors.length - 1 ? ' & ' : index > 0 ? ', ' : null}
                  <a href={author.href} target="_blank" rel="noopener noreferrer">
                    {author.name}
                    <span className="sr-only"> (se abre en una pestaña nueva)</span>
                  </a>
                </Fragment>
              ))}
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
