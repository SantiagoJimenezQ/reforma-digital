import { useEffect, useRef, useState } from 'react';
import { cn } from '@reforma-digital/design/lib/utils';
import type { FuenteVista } from '../shared/api';
import { host } from './formato';
import { Icono } from './icono';

/** El origen de una web (`https://sede.policia.gob.es`), sin ruta ni parámetros. */
const origen = (url: string) => {
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
function Favicon({ web, className }: { web: string; className?: string }) {
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

/**
 * Las webs oficiales que consultó el asistente para una respuesta, en un desplegable. Cada una
 * se abre en el navegador del trámite.
 */
export function FuentesRespuesta({
  fuentes,
  abrir,
}: {
  fuentes: FuenteVista[];
  abrir: (url: string) => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const lista = useRef<HTMLUListElement>(null);
  // Al abrirla, la lista se ve entera aunque esté al final de la conversación.
  useEffect(() => {
    if (abierta) lista.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [abierta]);
  if (!fuentes.length) return null;
  // Primero las páginas que leyó enteras; después, los extractos del buscador. La misma página
  // con otra dirección (con o sin barra final, otra ruta) sale una vez.
  const vistas = new Set<string>();
  const orden = [...fuentes]
    .sort((a, b) => Number(b.origen === 'pagina') - Number(a.origen === 'pagina'))
    .filter((f) => {
      const clave = `${origen(f.url)} ${f.titulo}`;
      if (vistas.has(clave)) return false;
      vistas.add(clave);
      return true;
    });
  const webs = [...new Set(orden.map((f) => origen(f.url)))].slice(0, 4);
  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={abierta}
        onClick={() => setAbierta(!abierta)}
        className="flex items-center gap-2 rounded-full border border-border py-1 pr-3 pl-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <span className="flex -space-x-1.5">
          {webs.map((w) => (
            <Favicon key={w} web={w} className="ring-2 ring-background" />
          ))}
        </span>
        {orden.length === 1 ? '1 fuente' : `${orden.length} fuentes`}
        <Icono nombre="siguiente" size={14} className={abierta ? 'rotate-90' : ''} />
      </button>
      {abierta && (
        <ul ref={lista} className="mt-2 mb-0 space-y-0.5 p-0">
          {orden.map((f) => (
            <li key={f.id} className="list-none">
              <button
                type="button"
                onClick={() => abrir(f.url)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted"
              >
                <Favicon web={origen(f.url)} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] leading-snug">{f.titulo}</span>
                  <span className="block text-sm text-muted-foreground">
                    {f.organismo ?? host(f.url)}
                    {f.origen === 'pagina' ? '' : ' · extracto del buscador'}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
