'use client';
import { Input } from '@reforma-digital/design/ui/input';
import { Card } from '@reforma-digital/design/ui/card';

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
    <Card
      className="bg-muted ring-0"
      render={<section className={'cg-coalition [margin:32px_0] [&_.cg-grid_label]:grid'} />}
    >
      <h2>Prueba el reparto D’Hondt</h2>
      <p>
        Una circunscripción ficticia: 3 % de barrera, sin votos en blanco. Los empates exactos
        requieren el procedimiento oficial; aquí se muestran por orden de candidatura.
      </p>
      <label>
        Escaños
        <Input
          type="number"
          min={1}
          max={52}
          value={seats}
          onChange={(e) => setSeats(Math.max(1, Math.min(52, Number(e.target.value))))}
        />
      </label>
      <div
        className={
          'cg-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-5 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_560px)]:[grid-template-columns:1fr]'
        }
      >
        {votes.map((vote, i) => (
          <label key={i}>
            Candidatura {i + 1}
            <Input
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
      <div aria-live="polite" className={'flex flex-wrap items-center gap-3'}>
        {result.map((n, i) => (
          <p key={i}>
            Candidatura {i + 1}: <b>{n} escaños</b>
          </p>
        ))}
      </div>
    </Card>
  );
}
