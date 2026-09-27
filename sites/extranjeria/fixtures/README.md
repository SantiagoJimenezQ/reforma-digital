# Páginas de prueba

HTML **real** de las páginas públicas de cita previa de Extranjería, capturado el 27‑09‑2026 con `npm run site:live -- extranjeria` (Madrid, trámite «Toma de huellas»), sin identificarse.

Al capturarlo se eliminan `<script>`, `<noscript>` e `<iframe>`, se vacían los `<input type="hidden">` (tokens anti‑CSRF) y se quitan los `;jsessionid`. No contienen datos personales, cookies ni sesiones.

`routes.json` indica qué fichero sirve el laboratorio local (`npm run dev`) para cada ruta oficial. Lo usan las pruebas `tests/e2e/extranjeria.spec.ts`.
