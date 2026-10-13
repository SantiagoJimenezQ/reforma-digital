import { z } from 'zod';

const embargoSchema = z.tuple([z.iso.date(), z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)]);
export function pollsHidden(embargo: unknown, now = new Date()) {
  const [from, until] = embargoSchema.parse(embargo);
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(now)
    .replace(' ', 'T');
  return parts.slice(0, 10) >= from && parts < until;
}
