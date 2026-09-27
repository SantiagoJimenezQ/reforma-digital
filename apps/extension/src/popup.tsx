import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';

type Status = { site: string; name: string; state: string };
const stateText: Record<string, string> = {
  active: 'Interfaz activada',
  original: 'Estás usando la interfaz original',
  disabled: 'Desactivada para este portal',
  unsupported: 'Esta pantalla conserva la interfaz original',
};
async function send(type: string): Promise<Status | { state: string }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');
  return chrome.tabs.sendMessage(tab.id, { type });
}
function Popup() {
  const [status, setStatus] = useState<Status | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void send('status')
      .then((value) => setStatus(value as Status))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  async function toggle() {
    if (!status) return;
    setBusy(true);
    setError('');
    try {
      const saved = await chrome.storage.local.get('disabledSites');
      const ids = new Set<string>(
        Array.isArray(saved.disabledSites)
          ? saved.disabledSites.filter((v: unknown): v is string => typeof v === 'string')
          : [],
      );
      if (status.state === 'disabled') ids.delete(status.site);
      else ids.add(status.site);
      await chrome.storage.local.set({ disabledSites: [...ids] });
      if (!ids.has(status.site)) await send('enable');
      else await send('restore');
      setStatus((await send('status')) as Status);
    } catch {
      setError('No se pudo cambiar la vista. Recarga esta página e inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main>
      <h1>Better Government</h1>
      <section>
        {!ready
          ? 'Comprobando esta página…'
          : status
            ? stateText[status.state]
            : 'No hay una integración disponible en esta pestaña.'}
        {status ? <small>{status.name}</small> : null}
      </section>
      {status ? (
        <button disabled={busy} onClick={() => void toggle()}>
          {busy
            ? 'Aplicando…'
            : status.state === 'disabled'
              ? 'Activar en este portal'
              : 'Desactivar en este portal'}
        </button>
      ) : (
        <a
          className="visit"
          href="https://www.citapreviadnie.es/citaPreviaDni/Inicio.action"
          target="_blank"
          rel="noreferrer"
        >
          Abrir cita previa del DNI ↗
        </a>
      )}
      {error ? <p role="alert">{error}</p> : null}
      <footer>DNI: adaptación experimental. No es un servicio oficial.</footer>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Popup />);
