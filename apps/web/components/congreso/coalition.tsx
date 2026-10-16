'use client';
import { Checkbox } from '@reforma-digital/design/ui/checkbox';
import { Card } from '@reforma-digital/design/ui/card';

import { useState } from 'react';
import { Icon } from '../brand/icon';

export function Coalition({ seats }: { seats: Record<string, number> }) {
  const [selected, setSelected] = useState<string[]>([]);
  const total = selected.reduce((sum, id) => sum + (seats[id] ?? 0), 0);
  return (
    <Card
      className="bg-muted ring-0"
      render={<div className={'cg-coalition [margin:32px_0] [&_.cg-grid_label]:grid'} />}
    >
      <h3>Prueba una suma de escaños</h3>
      <p>Selecciona partidos. Una suma numérica no implica que exista un acuerdo político.</p>
      <div className={'flex flex-wrap items-center gap-3'}>
        {Object.entries(seats)
          .sort(([, a], [, b]) => b - a)
          .map(([id, n]) => (
            <label key={id} className="flex min-h-11 items-center gap-2">
              <Checkbox
                checked={selected.includes(id)}
                onCheckedChange={(checked) =>
                  setSelected(checked ? [...selected, id] : selected.filter((p) => p !== id))
                }
              />
              <span>
                {id} · {n}
              </span>
            </label>
          ))}
      </div>
      <p aria-live="polite">
        <b>
          {total} {total === 1 ? 'escaño' : 'escaños'}
        </b>{' '}
        ·{' '}
        {total >= 176
          ? 'Supera la mayoría absoluta de 176'
          : `Faltan ${176 - total} para la mayoría absoluta`}
      </p>
    </Card>
  );
}
