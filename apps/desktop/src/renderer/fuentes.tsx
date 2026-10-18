import { useState } from 'react';
import { cn } from '@reforma-digital/design/lib/utils';
import { host } from './formato';
import { Icono } from './icono';

/** El origen de una web (`https://sede.policia.gob.es`), sin ruta ni parámetros. */
export const origen = (url: string) => {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
};

/**
 * El icono de la web, del servicio de favicons de Google. Solo se le envía el origen, sin ruta,
 * sin referer y al mostrarse; si no carga, se dibuja un globo.
 */
export function Favicon({ web, className }: { web: string; className?: string }) {
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
      src={`https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(web)}&sz=64`}
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

/** El dominio de la web sin subdominios: «prestaciones.seg-social.es» y «revista.seg-social.es» son la misma. */
export const sitio = (url: string) => {
  const partes = host(url).split('.');
  return partes
    .slice(['gob', 'org', 'com', 'edu', 'nom'].includes(partes.at(-2) ?? '') ? -3 : -2)
    .join('.');
};
