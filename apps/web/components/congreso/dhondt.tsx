'use client';
import { Field, Actions, Surface } from '@reforma-digital/design/sol';

import { useState } from 'react';

export function Dhondt() {
  const [seats, setSeats] = useState(10);
  const [votes, setVotes] = useState([50000, 30000, 15000, 5000]);
  const valid = votes.reduce((sum, n) => sum + n, 0);
  const quotients = votes
    .flatMap((vote, party) =>
      vote > 0 && vote >= valid * 0.03
        ? Array.from({ length: seats }, (_, i) => ({ party, quotient: vote / (i + 1), vote }))
        : [],
    )
    .sort((a, b) => b.quotient - a.quotient || b.vote - a.vote || a.party - b.party);
  const result = votes.map(
    (_, party) => quotients.slice(0, seats).filter((q) => q.party === party).length,
  );
  return (
    <Surface asChild tone="muted">
      <section className="cg-coalition">
        <h2>Prueba el reparto D’Hondt</h2>
        <p>
          Una circunscripción ficticia: 3 % de barrera, sin votos en blanco. Los empates exactos
          requieren el procedimiento oficial; aquí se muestran por orden de candidatura.
        </p>
        <label>
          Escaños
          <Field
            type="number"
            min={1}
            max={52}
            value={seats}
            onChange={(e) => setSeats(Math.max(1, Math.min(52, Number(e.target.value))))}
          />
        </label>
        <div className="cg-grid">
          {votes.map((vote, i) => (
            <label key={i}>
              Candidatura {i + 1}
              <Field
                type="number"
                min={0}
                max={10000000}
                step={1}
                value={vote}
                onChange={(e) =>
                  setVotes(
                    votes.map((v, j) =>
                      j === i
                        ? Math.max(0, Math.min(10000000, Math.floor(Number(e.target.value))))
                        : v,
                    ),
                  )
                }
              />
            </label>
          ))}
        </div>
        <Actions aria-live="polite">
          {result.map((n, i) => (
            <p key={i}>
              Candidatura {i + 1}: <b>{n} escaños</b>
            </p>
          ))}
        </Actions>
      </section>
    </Surface>
  );
}
