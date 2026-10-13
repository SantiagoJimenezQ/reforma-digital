'use client';
import { Button } from '@reforma-digital/design/sol';

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main id="main" tabIndex={-1} className="cg-body">
      <h1>El Congreso no está disponible ahora</h1>
      <p>No hemos podido cargar los datos. Puedes volver a intentarlo.</p>
      <Button onClick={retry}>Reintentar</Button>
    </main>
  );
}
