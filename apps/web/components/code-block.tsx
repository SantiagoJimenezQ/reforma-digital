'use client';
import { useState } from 'react';
import { Button } from '@reforma-digital/design/ui/button';
import { Icon } from './brand/icon';

export function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    // Sin permiso de portapapeles el código sigue a la vista para seleccionarlo.
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }
  return (
    <figure className="my-4 overflow-hidden rounded-2xl bg-foreground text-background">
      <figcaption className="flex items-center justify-between border-b border-background/15 py-1 pr-1 pl-4 font-mono text-xs uppercase tracking-wider text-background/70">
        {label}
        <Button
          variant="ghost"
          size="icon"
          className="text-background hover:bg-background/15 hover:text-background"
          onClick={() => void copy()}
          aria-label={copied ? 'Copiado' : `Copiar ${label}`}
        >
          <Icon name={copied ? 'hecho' : 'copiar'} size={16} />
        </Button>
      </figcaption>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </figure>
  );
}
