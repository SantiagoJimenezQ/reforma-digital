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
      className="chat-hidden-datum"
      tabIndex={0}
      aria-describedby={id}
      onMouseEnter={(event) => place(event.currentTarget)}
      onFocus={(event) => place(event.currentTarget)}
    >
      {text}
      <span id={id} className="chat-hidden-tooltip" role="tooltip" style={position}>
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
