'use client';
import { Button } from '@reforma-digital/design/ui/button';

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto max-w-(--container-content) px-(--page-gutter) pt-8 pb-20"
    >
      <h1>Las elecciones no están disponibles ahora</h1>
      <p>No hemos podido cargar los datos. Puedes volver a intentarlo.</p>
      <Button onClick={retry} variant="sunset" size="xl">
        Reintentar
      </Button>
    </main>
  );
}
