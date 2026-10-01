# Consulta de asociaciones (Fichero de Denominaciones)

Subproyecto del monorepo. Estado experimental; incluido en el build. Una ruta exacta: la consulta pública de la Sede del Ministerio del Interior.

## Pantallas

| Carpeta               | Ruta                                                  | Adaptación                                                                                                                                                                                                                                           |
| --------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/consulta/` | `sede.interior.gob.es/portal/sede/asociacionesLegacy` | El campo oficial `#denominacion` se sustituye en su sitio por un `BoundField` (Intro activa el «Buscar» oficial). Guía que cambia según el estado: búsqueda, resultados (término, página y número de filas) o el mensaje oficial de «sin resultados» |

«Búsqueda exacta» y «Buscar» siguen siendo controles originales. La casilla actualiza su valor solo al perder el foco (`onblur`), y un clic sintético no lo reproduce, así que no se sustituye. El tema `@reforma-digital/design/themes/sede-interior.css` re‑estiliza cabecera, tarjetas, tabla y paginación. En móvil, cada resultado se apila con la etiqueta de columna oficial.

La consulta no tiene páginas de detalle en la web oficial.

## Evidencia y trabajo pendiente

El 27 de septiembre de 2026 se consultó la web real con la extensión (`npm run site:live -- registro-asociaciones`) con términos genéricos («vecinos» y uno sin resultados). No hay identificación, CAPTCHA ni comprobación anti‑bot en la Sede. La página informativa de `www.interior.gob.es` sí tiene una comprobación de Cloudflare y no se usa.

Los valores escritos por script no activan `minlength` en el navegador. Por eso `DomBridge` comprueba los límites de longitud del control oficial antes de enviar el formulario: una búsqueda de un carácter se detiene y el campo muestra el aviso, igual que en la web oficial.

Pendiente: la paginación oficial falla en búsquedas muy grandes (p. ej. «cultural», página 2 → «Error general»), un problema de la propia web que no se corrige; solo castellano.
