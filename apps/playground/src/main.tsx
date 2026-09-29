import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { mountAdapter } from '@reforma-digital/runtime';
import { dniAdapter } from '@reforma-digital/site-dni';
import { DomBridge } from '@reforma-digital/bridge';
import { BridgeProvider, BoundField, BoundButton } from '@reforma-digital/react';
import './style.css';

function Demo() {
  return (
    <main className="demo-layout">
      <section className="form-card">
        <header>
          <h2>Datos del DNI</h2>
          <p>Usa datos ficticios para probar el formulario.</p>
        </header>
        <form
          id="demo-form"
          method="post"
          action="/demo-only"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;
            const data = new FormData(form, submitter);
            document.getElementById('result')!.textContent =
              `Conexión comprobada. El formulario original recibió ${Array.from(data.keys()).length} campos y el botón «${data.get('operation')}». No se ha enviado ninguna solicitud.`;
          }}
        >
          <input type="hidden" name="csrf" value="local-fixture-only" />
          <div className="form-grid">
            <div className="wide-field">
              <label className="native-label" htmlFor="dni">
                Número de Documento:
              </label>
              <input
                id="dni"
                name="numero"
                type="text"
                maxLength={8}
                pattern="[0-9]{8}"
                placeholder="00000000"
                required
              />
            </div>
            <div>
              <label className="native-label" htmlFor="letter">
                Letra:
              </label>
              <input id="letter" name="letra" type="text" maxLength={1} placeholder="A" required />
            </div>
            <div className="full-field">
              <label className="native-label" htmlFor="team">
                Equipo de Expedición:
              </label>
              <input id="team" name="equipo" type="text" placeholder="000000" required />
            </div>
            <div className="full-field">
              <label className="native-label" htmlFor="expiry">
                Fecha de Validez:
              </label>
              <input id="expiry" name="validez" type="text" placeholder="dd/mm/aaaa" required />
            </div>
            <div className="full-field">
              <label className="native-label" htmlFor="support">
                Número de Soporte:
              </label>
              <input id="support" name="soporte" type="text" placeholder="AAA000000" required />
            </div>
          </div>
          <fieldset className="security-block">
            <legend>Código de prueba</legend>
            <div className="captcha-row">
              <span className="captcha" aria-label="Código de prueba ABCD">
                A B C D
              </span>
            </div>
            <label htmlFor="captcha">Introduce el código que aparece arriba</label>
            <input id="captcha" name="captcha" type="text" placeholder="ABCD" required />
          </fieldset>
          <div className="form-actions">
            <button type="reset" className="secondary">
              Borrar datos
            </button>
            <button
              id="continue"
              type="submit"
              name="operation"
              value="continuar"
              className="primary"
            >
              Probar envío
            </button>
          </div>
        </form>
        <p id="result" role="status" className="result" />
      </section>
    </main>
  );
}
flushSync(() => createRoot(document.getElementById('demo-root')!).render(<Demo />));
let runtime = mountAdapter(dniAdapter, {
  url: new URL(dniAdapter.routes[0]!.origin + '/citaPreviaDni/InicioDNINIE.action'),
  demo: true,
  onState: (state) => {
    document.getElementById('toggle')!.textContent =
      state === 'active' ? 'Ver original' : 'Activar interfaz';
  },
});
document.getElementById('toggle')!.addEventListener('click', () => {
  if (runtime.state() === 'active') runtime.restore();
  else
    runtime = mountAdapter(dniAdapter, {
      url: new URL(dniAdapter.routes[0]!.origin + '/citaPreviaDni/InicioDNINIE.action'),
      demo: true,
      onState: (state) => {
        document.getElementById('toggle')!.textContent =
          state === 'active' ? 'Ver original' : 'Activar interfaz';
      },
    });
});

// An explicit, developer-authored example: original controls stay visible for comparison.
const lab = document.createElement('section');
lab.id = 'bridge-lab';
lab.className = 'bridge-lab';
lab.innerHTML = `<header><h2>Prueba de sincronización</h2><p>Edita cualquiera de las dos columnas y comprueba la sincronización.</p></header><div class="lab-columns"><form id="lab-source"><h3>Controles originales</h3><input type="hidden" name="token" value="demo-token"><label for="lab-name">Nombre de prueba</label><input id="lab-name" name="name" value="Ada"><label for="lab-office">Oficina</label><select id="lab-office" name="office"><option value="madrid">Madrid</option><option value="sevilla">Sevilla</option></select><label><input id="lab-check" name="notice" type="checkbox"> Recibir aviso</label><label for="lab-notes">Notas</label><textarea id="lab-notes" name="notes">Datos ficticios</textarea><button id="lab-submit" type="submit" name="operation" value="save">Comprobar formulario</button><button type="reset">Restablecer</button><p>Los controles siguientes se conservan como elementos originales.</p><label for="lab-file">Archivo local</label><input id="lab-file" type="file" name="attachment"><label for="lab-date">Fecha</label><input id="lab-date" type="date" name="date"></form><div id="lab-react"></div></div><output id="lab-output" aria-live="polite"></output>`;
document.body.append(lab);
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const bridge = new DomBridge(
  {
    name: { element: element<HTMLInputElement>('lab-name'), label: 'Nombre de prueba' },
    office: { element: element<HTMLSelectElement>('lab-office'), label: 'Oficina' },
    notice: { element: element<HTMLInputElement>('lab-check'), label: 'Recibir aviso' },
    notes: { element: element<HTMLTextAreaElement>('lab-notes'), label: 'Notas' },
  },
  { submit: { element: element<HTMLButtonElement>('lab-submit'), label: 'Comprobar formulario' } },
);
createRoot(element('lab-react')).render(
  <BridgeProvider value={bridge}>
    <h3>Componentes React conectados</h3>
    <BoundField binding="name" submitAction="submit" />
    <BoundField binding="office" />
    <BoundField binding="notice" />
    <BoundField binding="notes" />
    <BoundButton binding="submit" className="primary" />
  </BridgeProvider>,
);
element<HTMLFormElement>('lab-source').addEventListener('submit', (event) => {
  event.preventDefault();
  element('lab-output').textContent = JSON.stringify(
    Object.fromEntries(
      new FormData(element<HTMLFormElement>('lab-source'), (event as SubmitEvent).submitter),
    ),
    null,
    2,
  );
});
window.addEventListener('pagehide', () => bridge.dispose(), { once: true });
