import { useState } from 'react';
import { cn } from '@reforma-digital/design/lib/utils';
import { Icono } from './icono';

/**
 * El icono de la web, del servicio de favicons de Google. Solo se le envía el origen, sin ruta,
 * sin referer y al mostrarse; si no carga, se dibuja un globo.
 */
export function Favicon({ url, className }: { url: string; className?: string }) {
  const [falla, setFalla] = useState(false);
  const base = cn('size-5 shrink-0 rounded-full bg-background', className);
  if (falla)
    return (
      <span className={cn(base, 'grid place-items-center bg-muted text-muted-foreground')}>
        <Icono nombre="web" size={12} />
      </span>
    );
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(URL.parse(url)?.origin ?? '')}&sz=64`}
      alt=""
      width={20}
      height={20}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFalla(true)}
      className={base}
    />
  );
}
