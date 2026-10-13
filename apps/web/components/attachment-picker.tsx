'use client';
import { Button } from '@reforma-digital/design/ui/button';

import { useRef } from 'react';
import { Icon } from './brand/icon';
import { readPdfContext, type PdfContext } from '../lib/attachment';
export function AttachmentPicker({
  busy,
  disabled,
  onBusy,
  onAttachment,
  onError,
}: {
  busy: boolean;
  disabled: boolean;
  onBusy: (v: boolean) => void;
  onAttachment: (value: PdfContext) => void;
  onError: (v: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        type="file"
        accept="application/pdf,.pdf"
        ref={input}
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          onBusy(true);
          onError('');
          try {
            if (file.size > 5 * 1024 * 1024)
              throw new Error('El PDF debe ocupar como máximo 5 MB.');
            onAttachment(await readPdfContext(file.name, new Uint8Array(await file.arrayBuffer())));
          } catch (error) {
            onError(error instanceof Error ? error.message : 'No se ha podido leer el PDF.');
          } finally {
            onBusy(false);
          }
        }}
      />
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className={
          "chat-icon inline-flex justify-center items-center [&[aria-pressed='true']_.icono]:[animation:chat-pulse_320ms_var(--ease-brand)] [@media(prefers-reduced-motion:_reduce)]:[&[aria-pressed='true']_.icono]:[animation:none] chat-attach"
        }
        disabled={disabled || busy}
        onClick={() => input.current?.click()}
        aria-label="Adjuntar PDF"
        title="Adjuntar PDF · Hasta 5 MB y 20 páginas"
      >
        <Icon name="paperclip" size={20} />
      </Button>
    </>
  );
}
