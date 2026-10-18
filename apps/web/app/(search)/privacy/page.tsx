import type { Metadata } from 'next';
import { InfoPage } from '../../../components/brand/info-page';
import { JsonLd } from '../../../components/json-ld';
import { breadcrumbs, pageMetadata, webPage } from '../../../lib/seo';

const title = 'Privacidad · Reforma Digital';
const description =
  'Sin cuenta y sin cookies publicitarias. Qué datos procesa la web de Reforma Digital y qué servicios externos intervienen.';

export const metadata: Metadata = pageMetadata({
  title,
  description,
  path: '/privacy',
  og: 'privacidad',
});

const graph = [
  webPage({ name: title, description, path: '/privacy' }),
  breadcrumbs('Privacidad', '/privacy'),
];

export default function Privacy() {
  return (
    <InfoPage narrow>
      <JsonLd graph={graph} />
      <span
        className={
          't-etiqueta [font-family:var(--font-brand-mono)] text-xs font-medium [line-height:1.3] [letter-spacing:0.08em] uppercase info-etiqueta block mb-4 [color:var(--text-secondary)]'
        }
      >
        TUS DATOS, CON CUIDADO
      </span>
      <h1>Navega sin identificarte.</h1>
      <p
        className={
          'info-entradilla [max-width:65ch] mb-10 [color:var(--text-secondary)] text-lg [line-height:1.6]'
        }
      >
        No necesitas una cuenta. Esta web no te pide datos personales.
      </p>
      <h2>Qué se procesa</h2>
      <p>
        Las fotos de la página del equipo vienen de GitHub y los contributors se consultan en su API
        pública. Nuestro servidor descarga y optimiza esas imágenes, así que tu navegador no se
        conecta con GitHub para verlas.
      </p>
      <p>
        Esta vista previa es un entorno de desarrollo, no una sede administrativa ni un servicio
        público desplegado.
      </p>
      <h2>Ubicación y cookies</h2>
      <p>No solicitamos permisos de localización. No instalamos cookies publicitarias.</p>
    </InfoPage>
  );
}
