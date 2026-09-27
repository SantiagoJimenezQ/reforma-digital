/** A real link preserves middle-click, browser navigation and context menus. */
export function AccessCard({ source }: { source: HTMLAnchorElement }) {
  return (
    <a
      className="my-3 block max-w-[690px] rounded border border-[#b8cbbd] bg-white p-4 no-underline hover:border-[#637e67] hover:bg-[#eef3e9]"
      href={source.href}
      target={source.target || undefined}
      rel={source.rel || undefined}
    >
      <span>
        <strong className="block text-base">Acceder con DNI o NIE</strong>
      </span>
    </a>
  );
}
