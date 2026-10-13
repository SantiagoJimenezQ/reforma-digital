import type { Metadata } from 'next';
import { Fragment } from 'react';
import Link from 'next/link';
import { congressBase, congressSections } from '../../../lib/congreso/routes';
import { InfoPage } from '../../../components/sol/info-page';

// Índice del rediseño de El Congreso con Sol. No está enlazado desde la navegación ni se indexa: es para revisar
// cada página antes de publicarla.
export const metadata: Metadata = {
  title: 'El Congreso con Sol · Reforma Digital',
  robots: { index: false, follow: false },
};

export default function NewEscanoAbierto() {
  return (
    <InfoPage narrow>
      <span className="t-etiqueta info-etiqueta">VISTA PREVIA, SIN PUBLICAR</span>
      <h1>El Congreso con Sol</h1>
      <p className="info-entradilla">
        La adaptación nativa de El Congreso con Sol, conectada a nuestra API y a la base de datos de
        Reforma Digital.
      </p>
      {congressSections.map(({ title, pages }) => (
        <Fragment key={title}>
          <h2>{title}</h2>
          <ul>
            {pages.map(([nombre, ruta]) => (
              <li key={ruta}>
                <Link href={`${congressBase}/${ruta}`}>{nombre}</Link>
              </li>
            ))}
          </ul>
        </Fragment>
      ))}
    </InfoPage>
  );
}
