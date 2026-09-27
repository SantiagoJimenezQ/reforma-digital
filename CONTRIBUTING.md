# Contribuir

Cada cambio de un trámite se desarrolla dentro de `sites/<portal>`. El código compartido se mantiene en `packages/`; `apps/extension` se encarga de Chrome y `apps/playground` sirve para desarrollo local.

## Crear o mejorar una interfaz

1. Crea el subproyecto con `npm run site:new -- <id>` o entra en uno existente.
2. Define los dominios HTTPS exactos y el prefijo de rutas en `site.config.json`. Mantén `enabled: false` mientras no haya una pantalla implementada.
3. Crea `src/pages/<pantalla>/page.tsx` y `bindings.ts`. La primera define la interfaz y la segunda identifica los controles originales. Registra la pantalla en `src/pages/index.ts`.
4. Reutiliza componentes de `packages/react`. Los componentes específicos de ese portal van en su `src/components/`.
5. Añade HTML sintético o anonimizado en `fixtures/` y pruebas en `tests/`. Documenta si proviene del DOM real o si solo representa el contrato esperado.
6. Actualiza el README del portal con rutas adaptadas, controles que permanecen originales y verificaciones pendientes.

Las páginas implementan `SitePage`. El registro verifica el dominio y rechaza rutas ambiguas. `prepare` devuelve `null` si el DOM no coincide con el contrato, o una `Enhancement` con el motor de conexiones, las zonas a reemplazar y una comprobación de integridad.

```tsx
import { DomBridge, fieldByLabel } from '@better-government/bridge';
import { BridgeProvider, BoundField } from '@better-government/react';
import type { SitePage } from '@better-government/registry';

export const contactPage: SitePage = {
  id: 'contact',
  matches: (url) => url.pathname === '/tramite/contacto',
  prepare(document, _url, restore) {
    const email = fieldByLabel(document, 'Correo electrónico');
    if (!email) return null;
    const bridge = new DomBridge(
      { email: { element: email, label: 'Correo electrónico' } },
      {},
      { onIssue: restore },
    );
    return {
      bridge,
      title: 'Datos de contacto',
      description: 'Tu trámite',
      slots: [
        {
          source: email,
          render: () => (
            <BridgeProvider value={bridge}>
              <BoundField binding="email" />
            </BridgeProvider>
          ),
        },
      ],
      health: () => fieldByLabel(document, 'Correo electrónico') === email,
    };
  },
};
```

Este ejemplo requiere validar el comportamiento del campo en su portal. No basta con que coincida su etiqueta.

## Conexiones y límites

`DomBridge` admite texto, email, teléfono, URL, búsqueda, textarea, selects, checkbox y radio. `BoundField` usa la conexión por identificador. Para un botón, declara una acción con su elemento original y usa `BoundButton binding="continuar"` o `bridge.activate('continuar')`.

Los controles permanecen en su formulario y lugar originales. La vista alternativa se monta junto al control y lo oculta durante la adaptación. Si hay una validación nativa en un campo oculto, el runtime restaura la interfaz antes de que el navegador intente enfocarlo.

No sustituyas CAPTCHA, firma, certificados, archivos, contraseñas o widgets de navegador con una conexión de texto. Déjalos originales. Los eventos sintéticos no equivalen a todas las interacciones del usuario; comprueba teclado, autofill, validación, dependencias entre campos, mensajes del servidor y controles de frameworks. Un control que dependa de eventos no reproducidos necesita una integración específica o permanecer original.

No clones formularios completos ni reproduzcas las peticiones HTTP. No extraigas tokens, cookies o datos de sesión. No añadas código remoto, telemetría ni persistencia de campos.

## Comprobaciones

```sh
npm run format
npm run check
npm run test:e2e
```

Las pruebas de cada portal deben cubrir coincidencia exacta de dominio/ruta, DOM ambiguo o modificado, conexión de valores y preservación de los controles originales. Las pruebas de navegador deben comprobar los comportamientos que realmente cambia la interfaz.

`npm run check:workspaces` verifica los límites de dependencias. Un portal puede usar paquetes comunes, pero no importar código de otro portal o de una aplicación. Las utilidades compartidas deben moverse a `packages/`.

## Versiones de la extensión

El repositorio usa una versión de distribución en el `package.json` raíz. Los workspaces son privados: se empaquetan dentro de la extensión y no se publican individualmente en npm. Los cambios de interfaces llegan mediante una nueva versión completa de la extensión.

Actualiza la versión raíz, registra el cambio en `CHANGELOG.md`, ejecuta las comprobaciones y crea el ZIP con `npm run package`. La configuración de CI comprueba el repositorio y produce un artefacto; no publica automáticamente en Chrome Web Store.
