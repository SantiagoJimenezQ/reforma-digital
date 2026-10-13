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
        type="button"
        className={
          "chat-icon border-0 [background:transparent] [color:inherit] inline-flex justify-center items-center w-11 h-11 shrink-0 [border-radius:50%] p-0 [transition:background-color_160ms_ease,_color_160ms_ease,_transform_160ms_var(--ease-brand)] [&:not(:disabled):active]:[transform:scale(0.96)] [@media(hover:_hover)_and_(pointer:_fine)]:[&:hover]:[background:rgb(var(--bg-brand-100))] [&[aria-pressed='true']]:[background:rgb(var(--bg-brand-100))] [&[aria-pressed='true']]:[color:rgb(var(--bg-brand-600))] [&[aria-pressed='true']_.icono]:[animation:chat-pulse_320ms_var(--ease-brand)] [@media(prefers-reduced-motion:_reduce)]:[&[aria-pressed='true']_.icono]:[animation:none] chat-attach"
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
