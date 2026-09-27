# Cita previa DNI y pasaporte

Primer subproyecto del monorepo. Estado experimental; incluido en el build. Configuración en `site.config.json`.

## Pantallas

| Carpeta                     | Ruta                                 | Adaptación                                       |
| --------------------------- | ------------------------------------ | ------------------------------------------------ |
| `src/pages/access/`         | `/citaPreviaDni/Inicio.action`       | Enlace de entrada con datos DNI/NIE              |
| `src/pages/identification/` | `/citaPreviaDni/InicioDNINIE.action` | Cinco campos identificados por etiquetas exactas |

Cada carpeta contiene `page.tsx` y `bindings.ts`. `src/pages/index.ts` registra las pantallas. `src/components/` contiene los componentes propios y `src/styles/` los estilos del portal.

Las rutas con parámetros y el resto de las pantallas conservan el original. CAPTCHA, audio, acceso con DNI electrónico, cookies y botones originales permanecen en su sitio.

## Evidencia y trabajo pendiente

Las rutas y los campos visibles se consultaron en las [páginas públicas del portal](https://www.citapreviadnie.es/citaPreviaDni/Inicio.action). El [Ministerio del Interior](https://www.interior.gob.es/opencms/es/servicios-al-ciudadano/tramites-y-gestiones/dni/cita-previa/) enlaza este servicio.

Las primeras sesiones de navegador recibieron una página de bloqueo. El 10 de septiembre de 2026 se pudo acceder con Chrome de pruebas visible y la extensión 0.1.0 instalada y activada. La entrada condujo a `InicioDNINIE.action`; se comprobaron seis montajes, la cabecera y los cinco campos de identificación, y los estilos calculados de los inputs. Se escribió `00000000` en el campo React y se leyó el mismo valor en el input original `numDocumento`, cuyo formulario conserva la acción `Autentificar.action`. El botón «Ver original» eliminó los seis montajes y volvió a mostrar el input original vacío. No se envió el formulario ni se resolvió el CAPTCHA.

La sustitución visual es parcial: conserva la maquetación antigua y presenta alguna etiqueta duplicada. Las fixtures siguen siendo sintéticas, no capturas oficiales. Esta comprobación no valida todas las variantes del DOM ni los flujos autenticados.

Pendiente: inspección del DOM real, pruebas manuales de DNI/NIE y pérdida de documento, mensajes de error, teclado/autofill, CAPTCHA/audio, certificado, selección de oficina/fecha, confirmación, consulta y anulación. No se ha reservado ninguna cita ni probado una firma o certificado real.

Las pruebas locales cubren selección de rutas, rechazo de DOM ambiguo y conexión de los campos declarados. Las pruebas en Chromium están en `tests/e2e/extension.spec.ts` desde la raíz del repositorio.
