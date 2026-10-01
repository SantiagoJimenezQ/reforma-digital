"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="content-page">
      <h1>No hemos podido cargar esta página.</h1>
      <p className="lede">Inténtalo de nuevo en un momento.</p>
      <button className="primary-link" onClick={reset}>
        Volver a intentar
      </button>
    </main>
  );
}
