# Asistencia y Cita de la Agencia Tributaria

Subproyecto del monorepo. Estado experimental; incluido en el build. Configuración en `site.config.json`: dos rutas exactas, la página «Asistencia y Cita» de la Sede y el catálogo de servicios de `www2`.

## Pantallas

| Carpeta                 | Ruta                                                             | Adaptación                                                                                                                                                                                                                                                                           |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/pages/asistencia/` | `sede.agenciatributaria.gob.es/Sede/procedimientoini/GC29.shtml` | Guía con el aviso oficial sobre la Renta, las tres gestiones oficiales como opciones equivalentes (con el tipo de acceso que declara la página y su tutorial oficial), enlace al catálogo y otras vías citadas de la página. Cada opción activa el enlace oficial mediante el bridge |
| `src/pages/catalogo/`   | `www2.agenciatributaria.gob.es/wlpl/TOCP-MUTE/ServiciosAsocCat`  | Buscador sobre los 89 servicios del catálogo oficial (sin tildes; «clave» encuentra «Cl@ve»), con filtros por categoría y canal. «Solicita asistencia y cita» activa el botón oficial de ese servicio. El catálogo oficial sigue visible (tiene «¿En qué oficinas?»)                 |

`src/styles/theme.css` aplica el tema AEAT del sistema de diseño (`@reforma-digital/design/themes/aeat.css`) y oculta solo el recuadro oficial de gestiones, que el panel replica.

La identificación (`/wlpl/TOCP-MUTE/internet/identificacion`, NIF y nombre) y los pasos siguientes no tienen pantalla registrada: conservan la interfaz original.

## Evidencia y trabajo pendiente

El 27 de septiembre de 2026 se recorrieron las dos páginas públicas con la extensión cargada (`npm run site:live -- hacienda`). No se pulsó ninguna solicitud de cita. No hubo comprobación anti‑bot, CAPTCHA ni aviso de cookies.

El catálogo se pinta por JavaScript (petición `POST` de la propia página). El runtime espera a que aparezcan los servicios. Fixtures: HTML real, sin scripts ni tokens.

Pendiente: el widget flotante oficial «¿Dudas?» (`#ClickToCall`) se conserva sin re‑estilizar; las rutas de colaboradores (`www1`, con certificado) no están cubiertas; solo castellano.
