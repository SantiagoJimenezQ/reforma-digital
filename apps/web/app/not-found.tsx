import Link from 'next/link';
import { InfoPage } from '../components/brand/info-page';
export default function NotFound() {
  return (
    <InfoPage narrow>
      <p
        className={
          't-etiqueta [font-family:var(--font-brand-mono)] text-xs font-medium [line-height:1.3] [letter-spacing:0.08em] uppercase info-etiqueta block mb-4 [color:var(--text-secondary)]'
        }
      >
        Página no encontrada
      </p>
      <h1>Por aquí no era.</h1>
      <p
        className={
          'info-entradilla [max-width:65ch] mb-10 [color:var(--text-secondary)] text-lg [line-height:1.6]'
        }
      >
        No encontramos esta página. Vuelve al buscador para encontrar tu trámite.
      </p>
      <Link className="boton" href="/chat">
        Ir al buscador
      </Link>
    </InfoPage>
  );
}
