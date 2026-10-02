import { redactQuery, REDACTION_RULES } from './redact';

export type HiddenRange = { start: number; end: number };
export type ProtectedText = { text: string; ranges: HiddenRange[] };

// Follow replacements back to the original message. Do not infer redactions
// from names or from marker-shaped text the user may have typed themselves.
export function protectionDetails(
  original: string,
  protectedText: string,
  placeholders: readonly string[],
  reveal: (token: string) => string,
): ProtectedText {
  const structured = redactQuery(original);
  const ranges: HiddenRange[] = [];
  let cursor = 0;
  // The same deterministic rules used for sending supply their exact offsets.
  let mapped = original;
  let positions = Array.from({ length: original.length }, (_, start) => ({
    start,
    end: start + 1,
  }));
  for (const [pattern, marker] of REDACTION_RULES) {
    const next: HiddenRange[] = [];
    cursor = 0;
    mapped = mapped.replace(pattern, (value: string, offset: number) => {
      next.push(...positions.slice(cursor, offset));
      const range = {
        start: positions[offset]!.start,
        end: positions[offset + value.length - 1]!.end,
      };
      ranges.push(range);
      next.push(...Array.from({ length: marker.length }, () => range));
      cursor = offset + value.length;
      return marker;
    });
    next.push(...positions.slice(cursor));
    positions = next;
  }
  if (mapped !== structured) return { text: protectedText, ranges: [] };

  cursor = 0;
  let outputCursor = 0;
  const introduced = new Set(placeholders);
  for (const match of protectedText.matchAll(/\[[A-Z][A-Z_]*_\d+\]/g)) {
    if (!introduced.has(match[0])) continue;
    const unchanged = protectedText.slice(outputCursor, match.index);
    if (!structured.startsWith(unchanged, cursor)) return { text: protectedText, ranges: [] };
    cursor += unchanged.length;
    // A literal existing marker is unchanged, not a newly hidden datum.
    if (structured.startsWith(match[0], cursor)) {
      cursor += match[0].length;
    } else {
      const value = reveal(match[0]);
      const escaped = value
        .split(/\s+/)
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('\\s+');
      const source = new RegExp(`^(?:${escaped})`, 'i').exec(structured.slice(cursor));
      if (!source || value === match[0] || !source[0].length)
        return { text: protectedText, ranges: [] };
      ranges.push({
        start: positions[cursor]!.start,
        end: positions[cursor + source[0].length - 1]!.end,
      });
      cursor += source[0].length;
    }
    outputCursor = match.index + match[0].length;
  }
  if (structured.slice(cursor) !== protectedText.slice(outputCursor))
    return { text: protectedText, ranges: [] };
  const merged: HiddenRange[] = [];
  for (const range of ranges.sort((a, b) => a.start - b.start)) {
    const previous = merged.at(-1);
    if (previous && range.start < previous.end) previous.end = Math.max(previous.end, range.end);
    else merged.push({ ...range });
  }
  return { text: protectedText, ranges: merged };
}
