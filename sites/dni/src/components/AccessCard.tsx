/** A real link preserves middle-click, browser navigation and context menus. */
export function AccessCard({ source }: { source: HTMLAnchorElement }) {
  return (
    <a
      className="bg-card bg-text my-3 block max-w-[690px] p-4 no-underline hover:border-brand-600 hover:bg-brand-50 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      href={source.href}
      target={source.target || undefined}
      rel={source.rel || undefined}
    >
      <span>
        <strong className="bg-h3 block text-brand-700">Acceder con DNI o NIE</strong>
      </span>
    </a>
  );
}
