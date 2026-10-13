'use client';
import { Actions, Surface, Checkbox } from '@reforma-digital/design/sol';

import { useState } from 'react';
import { Icon } from '../sol/icon';

export function Coalition({ seats }: { seats: Record<string, number> }) {
  const [selected, setSelected] = useState<string[]>([]);
  const total = selected.reduce((sum, id) => sum + (seats[id] ?? 0), 0);
  return (
    <Surface asChild tone="muted">
      <div className="cg-coalition">
        <h3>Prueba una suma de escaños</h3>
        <p>Selecciona partidos. Una suma numérica no implica que exista un acuerdo político.</p>
        <Actions>
          {Object.entries(seats)
            .sort(([, a], [, b]) => b - a)
            .map(([id, n]) => (
              <Checkbox
                key={id}
                checked={selected.includes(id)}
                onCheckedChange={(checked) =>
                  setSelected(checked ? [...selected, id] : selected.filter((p) => p !== id))
                }
                icon={<Icon name="hecho" size={16} />}
              >
                {id} · {n}
              </Checkbox>
            ))}
        </Actions>
        <p aria-live="polite">
          <b>
            {total} {total === 1 ? 'escaño' : 'escaños'}
          </b>{' '}
          ·{' '}
          {total >= 176
            ? 'Supera la mayoría absoluta de 176'
            : `Faltan ${176 - total} para la mayoría absoluta`}
        </p>
      </div>
    </Surface>
  );
}
