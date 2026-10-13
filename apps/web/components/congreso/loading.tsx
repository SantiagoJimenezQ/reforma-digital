import { Surface } from '@reforma-digital/design/sol';
export function DataLoading() {
  return (
    <div role="status" className="cg-loading">
      <span className="sr-only">Cargando datos del Congreso…</span>
      <div className="cg-grid" aria-hidden="true">
        {[0, 1, 2].map((card) => (
          <Surface asChild key={card}>
            <div className="cg-card">
              <div className="cg-loading-line" />
              <div className="cg-loading-line" />
              <div className="cg-loading-line" />
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
