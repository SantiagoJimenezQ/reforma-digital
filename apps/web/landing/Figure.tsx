import type { ReactNode } from 'react';
interface Props {
  n: number;
  wide?: boolean;
  children: ReactNode;
  caption: ReactNode;
}
export default function Figure({ n, wide = false, children, caption }: Props) {
  return (
    <>
      <figure className={`my-10 mb-12 ${wide ? 'wide' : ''}`} id={`fig-${n}`}>
        {children}
        <figcaption className="mt-3.5 max-w-[72ch] font-mono text-xs leading-relaxed tracking-[0.01em] text-ink-subtle">
          <span className="text-ink">Fig. {n}.</span> {caption}
        </figcaption>
      </figure>
    </>
  );
}
