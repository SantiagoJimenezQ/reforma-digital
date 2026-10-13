'use client';
import { useState } from 'react';

export function Coalition({ seats }: { seats: Record<string, number> }) {
  const [selected, setSelected] = useState<string[]>([]);
  const total = selected.reduce((sum, id) => sum + (seats[id] ?? 0), 0);
  return (
    <div className="cg-coalition">
      <h3>Prueba una suma de escaños</h3>
      <p>Selecciona partidos. Una suma numérica no implica que exista un acuerdo político.</p>
      <div className="cg-tabs">
        {Object.entries(seats)
          .sort(([, a], [, b]) => b - a)
          .map(([id, n]) => (
            <label key={id}>
              <input
                type="checkbox"
                checked={selected.includes(id)}
                onChange={(event) =>
                  setSelected(
                    event.target.checked ? [...selected, id] : selected.filter((p) => p !== id),
                  )
                }
              />
              {id} · {n}
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
    </div>
  );
}
