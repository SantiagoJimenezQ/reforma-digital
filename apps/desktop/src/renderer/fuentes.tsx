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

/** El dominio de la web sin subdominios: «prestaciones.seg-social.es» y «revista.seg-social.es» son la misma. */
const sitio = (url: string) => {
  const partes = host(url).split('.');
  return partes
    .slice(['gob', 'org', 'com', 'edu', 'nom'].includes(partes.at(-2) ?? '') ? -3 : -2)
    .join('.');
};

const fila = 'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted';

/** Una página: su título y de quién es. */
function Pagina({ f, abrir }: { f: FuenteVista; abrir: (url: string) => void }) {
  return (
    <li className="list-none">
      <button type="button" onClick={() => abrir(f.url)} className={fila}>
        <Favicon web={origen(f.url)} />
        <span className="min-w-0">
          <span className="block truncate text-[15px] leading-snug">{f.titulo}</span>
          <span className="block text-sm text-muted-foreground">
            {f.organismo ?? host(f.url)}
            {f.nivel ? '' : ' · web sin verificar'}
            {f.origen === 'pagina' ? '' : ' · extracto del buscador'}
          </span>
        </span>
      </button>
    </li>
  );
}

/** Varias páginas del mismo organismo o web: una fila que se despliega en sus páginas. */
function Grupo({
  nombre,
  paginas,
  abrir,
}: {
  nombre: string;
  paginas: FuenteVista[];
  abrir: (url: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <li className="list-none">
      <button
        type="button"
        aria-expanded={abierto}
        onClick={() => setAbierto(!abierto)}
        className={fila}
      >
        <Favicon web={origen(paginas[0]!.url)} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] leading-snug">{nombre}</span>
          <span className="block text-sm text-muted-foreground">{paginas.length} páginas</span>
        </span>
        <Icono nombre="siguiente" size={14} className={abierto ? 'rotate-90' : ''} />
      </button>
      {abierto && (
        <ul className="mt-0.5 mb-1 ml-[22px] space-y-0.5 border-l border-border p-0 pl-3">
          {paginas.map((f) => (
            <li key={f.id} className="list-none">
              <button
                type="button"
                onClick={() => abrir(f.url)}
                className="w-full rounded-lg px-2 py-1.5 text-left text-[15px] leading-snug hover:bg-muted"
              >
                {f.titulo}
                {f.nivel ? (
                  ''
                ) : (
                  <span className="text-sm text-muted-foreground"> · sin verificar</span>
                )}
                {f.origen === 'pagina' ? (
                  ''
                ) : (
                  <span className="text-sm text-muted-foreground"> · extracto del buscador</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Las webs que consultó el asistente para una respuesta, en un desplegable: una fila por
 * organismo o web, y cada página se abre en el navegador del trámite (o del Mac, si no es oficial).
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
  // Las webs del mismo organismo (seg-social.es y seg-social.gob.es) van juntas, con su nombre.
  const organismo = new Map<string, string>();
  for (const f of fuentes)
    if (f.organismo && !organismo.has(sitio(f.url)))
      organismo.set(sitio(f.url), f.organismo.split(' · ')[0]!);
  const vistas = new Set<string>();
  const grupos = new Map<string, FuenteVista[]>();
  for (const f of [...fuentes].sort(
    (a, b) => Number(b.origen === 'pagina') - Number(a.origen === 'pagina'),
  )) {
    const clave = `${origen(f.url)} ${f.titulo}`;
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    const nombre = organismo.get(sitio(f.url)) ?? sitio(f.url);
    grupos.set(nombre, [...(grupos.get(nombre) ?? []), f]);
  }
  const webs = [...grupos.values()].slice(0, 4).map((g) => origen(g[0]!.url));
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
        {grupos.size === 1 ? '1 fuente' : `${grupos.size} fuentes`}
        <Icono nombre="siguiente" size={14} className={abierta ? 'rotate-90' : ''} />
      </button>
      {abierta && (
        <ul ref={lista} className="mt-2 mb-0 space-y-0.5 p-0">
          {[...grupos].map(([nombre, paginas]) =>
            paginas.length === 1 ? (
              <Pagina key={nombre} f={paginas[0]!} abrir={abrir} />
            ) : (
              <Grupo key={nombre} nombre={nombre} paginas={paginas} abrir={abrir} />
            ),
          )}
        </ul>
      )}
    </div>
  );
}
