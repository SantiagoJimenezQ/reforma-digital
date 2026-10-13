'use client';

import { useState } from 'react';
import { Button } from '@reforma-digital/design/sol';

export function Quiz({
  rounds,
}: {
  rounds: { c: [string, string, string, string, string]; grupos: string[] }[];
}) {
  const [round, setRound] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const current = rounds[round];
  if (!current)
    return (
      <div className="cg-quiz">
        <h2>
          {score} de {rounds.length}
        </h2>
        <p>
          Los aciertos no identifican una ideología: este juego usa citas de intervenciones
          concretas.
        </p>
        <Button
          onClick={() => {
            setRound(0);
            setScore(0);
            setAnswer(null);
          }}
        >
          Volver a jugar
        </Button>
      </div>
    );
  return (
    <div className="cg-quiz">
      <span className="t-etiqueta">
        Ronda {round + 1} de {rounds.length}
      </span>
      <blockquote>«{current.c[0]}»</blockquote>
      <p>¿De qué grupo es quien lo dijo?</p>
      <div className="cg-quiz-answers">
        {current.grupos.map((group) => (
          <Button
            key={group}
            variant="secondary"
            disabled={answer !== null}
            onClick={() => {
              setAnswer(group);
              if (group === current.c[2]) setScore(score + 1);
            }}
          >
            {group}
          </Button>
        ))}
      </div>
      <div aria-live="polite">
        {answer && (
          <>
            <p>
              <b>{answer === current.c[2] ? 'Correcto.' : `Era ${current.c[2]}.`}</b> {current.c[1]}{' '}
              · {current.c[4]}
            </p>
            <a
              className="cg-source"
              href={`https://www.congreso.es/public_oficiales/L${current.c[3].split('-')[1]}/CONG/DS/${current.c[3].split('-')[2]}/${current.c[3]}.PDF`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Diario de Sesiones (se abre en otra pestaña)
            </a>
            <Button
              onClick={() => {
                setRound(round + 1);
                setAnswer(null);
              }}
            >
              Siguiente
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
