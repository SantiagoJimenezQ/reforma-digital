import { Fragment, useState } from 'react';
import type { HiddenRange } from '../lib/pii-display';

function HiddenDatum({ text, id }: { text: string; id: string }) {
  const [position, setPosition] = useState({ left: 0, top: 0 });
  function place(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    setPosition({
      left: Math.max(16, Math.min(rect.left, window.innerWidth - 216)),
      top: rect.top >= 64 ? rect.top - 56 : rect.bottom + 8,
    });
  }
  return (
    <span
      className={
        'chat-hidden-datum relative [text-decoration:underline_dashed] [text-decoration-color:rgb(var(--bg-ink-muted))] [text-underline-offset:4px] [cursor:help] [&:focus-visible]:[outline:2px_solid_rgb(var(--bg-ink))] [&:focus-visible]:[outline-offset:3px] [&:focus-visible]:[border-radius:2px] [&:hover_.chat-hidden-tooltip]:[visibility:visible] [&:focus-visible_.chat-hidden-tooltip]:[visibility:visible]'
      }
      tabIndex={0}
      aria-describedby={id}
      onMouseEnter={(event) => place(event.currentTarget)}
      onFocus={(event) => place(event.currentTarget)}
    >
      {text}
      <span
        id={id}
        className={
          'chat-hidden-tooltip fixed [z-index:20] w-50 [padding:8px_10px] [border-radius:8px] [background:rgb(var(--bg-ink))] [color:rgb(var(--bg-surface))] text-xs font-normal [line-height:1.5] [white-space:normal] no-underline [visibility:hidden] pointer-events-none'
        }
        role="tooltip"
        style={position}
      >
        Este dato no se ha enviado al modelo.
      </span>
    </span>
  );
}

export function ProtectedQuestion({
  text,
  ranges,
  id,
}: {
  text: string;
  ranges: HiddenRange[];
  id: string;
}) {
  let cursor = 0;
  return (
    <>
      {ranges.map((range, index) => {
        const before = text.slice(cursor, range.start);
        cursor = range.end;
        const tooltipId = `hidden-${id}-${index}`;
        return (
          <Fragment key={range.start}>
            {before}
            <HiddenDatum text={text.slice(range.start, range.end)} id={tooltipId} />
          </Fragment>
        );
      })}
      {text.slice(cursor)}
    </>
  );
}
