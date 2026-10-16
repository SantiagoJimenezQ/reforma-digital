'use client';
import { useState } from 'react';
import SourcesMap from './sources-map';

export function SourcesMapPanel() {
  const [selectedId, onSelect] = useState<string | null>(null);
  return (
    <div
      className={
        'info-mapa mb-12 p-6 [border:1px_solid_var(--border)] [border-radius:20px] [background:var(--muted)] [@media(max-width:_600px)]:p-5'
      }
    >
      <SourcesMap selectedId={selectedId} onSelect={onSelect} />
    </div>
  );
}
