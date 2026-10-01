'use client';

import { useState, type FormEvent } from 'react';
import { ArrowUp, Search } from 'lucide-react';

export default function HeroComposer({
  onAsk,
}: {
  mode: 'preview' | 'live';
  onAsk: (query: string) => void;
}) {
  const [query, setQuery] = useState('');
  const ready = query.trim().length >= 4;
  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!ready) return;
    onAsk(query.trim());
  }
  return (
    <form className="hero-composer" id="buscador" onSubmit={submit}>
      <label htmlFor="question" className="sr-only">
        Pregunta sobre trámites
      </label>
      <div className="hero-composer-field">
        <Search size={18} strokeWidth={1.8} aria-hidden="true" />
        <input
          id="question"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="¿Qué trámite necesitas?"
          maxLength={1200}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" disabled={!ready} aria-label="Preguntar">
          <ArrowUp size={18} />
        </button>
      </div>
    </form>
  );
}
