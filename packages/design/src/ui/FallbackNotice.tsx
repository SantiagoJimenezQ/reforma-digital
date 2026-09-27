/**
 * Aviso discreto y no bloqueante cuando un adaptador no puede aplicarse
 * (DESIGN.md §3 · Aviso de fallback). La web oficial queda como la sirve la Administración.
 */
export function FallbackNotice({
  adapterName,
  reason,
  onClose,
}: {
  adapterName: string;
  reason: string;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      className="bg-card bg-text fixed bottom-3 left-3 right-3 z-[2147483646] max-w-sm p-4 text-[14px] shadow-raised sm:right-auto"
    >
      <p className="bg-eyebrow">Better Government · web original</p>
      <p className="mt-1.5">
        La mejora «{adapterName}» no es compatible con esta versión de la página, así que se muestra
        la web oficial sin cambios.
      </p>
      <details className="bg-small mt-2">
        <summary className="cursor-pointer">Detalle técnico</summary>
        <p className="mt-1 break-words">{reason}</p>
      </details>
      <button type="button" onClick={onClose} className="bg-btn bg-btn-secondary mt-3">
        Cerrar aviso
      </button>
    </div>
  );
}
