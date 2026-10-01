# Better Government · Sistema de diseño

Versión 1.0 · 2026‑09‑27

Este documento es la referencia visual de **todo** lo que Better Government pinta: los paneles, el popup y la capa de estilo que viste la web oficial. Ningún portal (`sites/<id>`) define colores, tamaños ni componentes propios: usa los de aquí.

| Qué                                    | Dónde vive en el código                                                                                                                                                                                                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens (color, forma, tipografía)      | [`packages/design/src/tokens.css`](packages/design/src/tokens.css)                                                                                                                                                                                                            |
| Componentes (botones, campos, avisos…) | [`packages/design/tailwind-preset.js`](packages/design/tailwind-preset.js)                                                                                                                                                                                                    |
| Componentes React                      | [`packages/design/src/ui/components.tsx`](packages/design/src/ui/components.tsx) · campos conectados en [`packages/react`](packages/react/src/index.tsx)                                                                                                                      |
| Temas para webs oficiales              | [`themes/morfos.css`](packages/design/themes/morfos.css) (framework Morfos de la AGE) · [`themes/aeat.css`](packages/design/themes/aeat.css) (Agencia Tributaria) · [`themes/sede-interior.css`](packages/design/themes/sede-interior.css) (Sede del Ministerio del Interior) |

Los componentes se definen **una sola vez** en el preset. Los paneles los usan como clases (`bg-btn bg-btn-primary`) y los temas los aplican a los elementos oficiales con `@apply`. Así, un botón oficial y un botón del panel son idénticos por construcción.

---

## 1. Principios

1. **La web oficial manda.** Toda la información sale de la página oficial y todas las acciones ejecutan controles oficiales. El diseño lo deja claro: etiqueta «Interfaz comunitaria · sitio oficial», dominio visible y bloques de «Información oficial».
2. **Una sola voz visual.** Mientras la mejora está activa, toda la página (panel, contenido oficial, cabecera, pie) usa los mismos tokens y componentes. No hay «islas» con estilos distintos.
3. **Claridad antes que decoración.** Una acción principal por pantalla, jerarquía tipográfica corta, mucho aire y nada de ornamentos.
4. **Nada importante se oculta.** Los avisos legales, errores, condiciones y requisitos se re‑maquetan, pero nunca se esconden, se acortan ni se reordenan.
5. **Accesible por defecto.** Todo cumple WCAG 2.2 AA: contraste, foco visible, objetivos de 44 px y controles nativos.
6. **Privado por diseño.** Sin fuentes, imágenes ni scripts remotos. Todo va dentro del paquete.

## 2. Tokens

### 2.1 Color

Los valores están en `packages/design/src/tokens.css` como canales RGB (`--bg-brand-600: 31 87 191`). El contraste está medido sobre blanco salvo que se indique otra cosa.

| Token              | Hex                               | Uso                                        | Contraste                  |
| ------------------ | --------------------------------- | ------------------------------------------ | -------------------------- |
| `ink`              | `#0F172A`                         | Texto principal, títulos                   | 17.9:1                     |
| `ink-muted`        | `#475569`                         | Texto secundario, ayudas                   | 7.6:1                      |
| `ink-subtle`       | `#5A6A80`                         | Metadatos, eyebrow                         | 5.5:1 (5.0 sobre `canvas`) |
| `canvas`           | `#F3F5F8`                         | Fondo de página                            | —                          |
| `surface`          | `#FFFFFF`                         | Tarjetas, campos                           | —                          |
| `surface-muted`    | `#F8FAFC`                         | Zonas secundarias, avisos neutros          | —                          |
| `line`             | `#E2E8F0`                         | Bordes de tarjeta, separadores             | decorativo                 |
| `line-strong`      | `#CBD5E1`                         | Borde de opciones seleccionables           | decorativo                 |
| `line-control`     | `#74849A`                         | Borde de campos y botón secundario         | 3.8:1 (WCAG 1.4.11)        |
| `brand-600`        | `#1F57BF`                         | **Acción principal**, enlaces, foco        | 6.6:1                      |
| `brand-700`        | `#1B469A`                         | Hover de acción/enlace                     | 8.8:1                      |
| `brand-50/100/200` | `#EEF4FF` `#DCE7FE` `#BFD3FE`     | Selección, badge, anillo de foco de campos | —                          |
| `brand-900`        | `#152C5C`                         | Texto sobre `brand-50`                     | 12.3:1                     |
| `info-*`           | `#EFF6FF` · `#BFDBFE` · `#1E3A8A` | Aviso informativo (fondo · borde · texto)  | 9.5:1                      |
| `warning-*`        | `#FFFBEB` · `#FCD34D` · `#78350F` | «Lee esto antes de continuar»              | 8.8:1                      |
| `danger-*`         | `#FEF2F2` · `#FCA5A5` · `#991B1B` | Errores y énfasis rojo de la web oficial   | 7.6:1                      |
| `success-*`        | `#ECFDF3` · `#A6F4C5` · `#05603A` | Confirmaciones                             | 7.3:1                      |

Reglas:

- Solo hay **un color de acción**: `brand-600`. No hay botones rojos, verdes ni del color corporativo de la web oficial.
- El color nunca es el único indicador: la selección lleva borde, fondo **y** peso de fuente; el estado del paso lleva número o ✓ **y** texto oculto para lectores de pantalla.
- Modo oscuro: **no** en la v1. El contenido oficial (tablas, imágenes, estilos inline) no se puede invertir con garantías.

### 2.2 Tipografía

Fuente: la del sistema (`system-ui, -apple-system, Segoe UI, Roboto…`). No se cargan fuentes remotas (§1.6).

| Clase                  | Tamaño / interlineado       | Peso | Uso                                                 |
| ---------------------- | --------------------------- | ---- | --------------------------------------------------- |
| `bg-h1`                | 28/1.2 (24 en móvil)        | 700  | Título del panel, uno por página                    |
| `bg-h2`                | 20/1.3                      | 650  | Secciones, títulos oficiales re‑maquetados          |
| `bg-h3`                | 17/1.4                      | 600  | Subsecciones, grupos de opciones                    |
| `bg-lead`              | 17/1.6                      | 400  | Entradilla bajo el título                           |
| `bg-text`              | 16/1.6                      | 400  | Cuerpo. **Mínimo absoluto para lectura**            |
| `bg-small` / `bg-hint` | 14/1.5                      | 400  | Ayudas y metadatos. Nunca para información esencial |
| `bg-eyebrow`           | 12/1.4, mayúsculas, +0.06em | 600  | Rótulos («Información oficial», «Paso 2 de 5»)      |

- Las líneas de lectura no pasan de unos 75 caracteres (`max-width: 70ch` en el cuerpo).
- Los textos oficiales en MAYÚSCULAS se muestran tal cual: no se reescriben.

### 2.3 Espaciado, forma y elevación

- Retícula de **4 px**. Escala habitual: 4, 8, 12, 16, 20, 24, 32, 48.
- Entre bloques de un panel: 20 px. Relleno de tarjeta: 16 px en móvil y 24 px desde 640 px.
- `--bg-radius-control`: **10 px** (botones, campos, opciones, avisos). `--bg-radius-card`: **16 px** (tarjetas y panel). `999px` solo para el badge.
- Sombras: `shadow-card` (casi plana) para tarjetas y `shadow-raised` solo para el aviso flotante de fallback. Nada más flota.
- Ancho máximo del contenido: **1120 px** (`--bg-content-max`).
- Puntos de corte: `sm` 640 px (una a varias columnas) y `lg` 1024 px (aparece la barra lateral oficial). Todo se diseña primero a **375 px**.

### 2.4 Movimiento

- Solo transiciones de color de 150 ms en hover. Sin animaciones de entrada.
- `prefers-reduced-motion: reduce` desactiva todas las transiciones y el desplazamiento suave.

## 3. Componentes

Los nombres de clase son los del preset. En React se usan los componentes que exporta `@better-government/design`.

| Componente               | Clases                                                                             | React                                     | Reglas                                                                                                                                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Barra superior**       | `bg-badge` + `bg-btn-secondary`                                                    | `Shell` (runtime) + `CommunityBadge`      | La pinta el runtime en toda página mejorada: «Interfaz comunitaria · sitio oficial», el dominio actual y el botón «Ver original». Ningún portal la repite.                                                                                    |
| **Panel**                | `bg-card`                                                                          | `Panel`                                   | Uno por página, justo después del título oficial. Contiene: `bg-h1` → `bg-lead` → progreso → contenido.                                                                                                                                       |
| **Campo conectado**      | `bg-bound` + `bg-label` + `bg-field` + `bg-hint`                                   | `BoundField` (`@better-government/react`) | Sustituye un control oficial en su sitio (slot) y lo sincroniza mediante `DomBridge`.                                                                                                                                                         |
| **Progreso**             | —                                                                                  | `ProgressSteps`                           | Lista de pasos con `aria-current="step"` desde 640 px; en móvil, una barra segmentada más «Paso N de M: nombre». Los pasos fuera del alcance llevan «solo en la web oficial».                                                                 |
| **Botón principal**      | `bg-btn bg-btn-primary` (+`bg-btn-lg`)                                             | `PrimaryAction`                           | Uno por pantalla. Verbo más destino («Continuar con Madrid»). Deshabilitado solo con una ayuda que diga por qué. Si la web oficial ofrece opciones equivalentes (p. ej. con o sin Cl@ve), **ninguna** se destaca: todas van como secundarias. |
| **Botón secundario**     | `bg-btn bg-btn-secondary`                                                          | `SecondaryAction`                         | «Volver» y acciones alternativas.                                                                                                                                                                                                             |
| **Enlace**               | `bg-link`                                                                          | `LinkButton`, `ExternalLink`              | Siempre subrayado. Los externos llevan ↗ y «(se abre en una pestaña nueva)» para lectores de pantalla.                                                                                                                                        |
| **Campo**                | `bg-label` + `bg-field` + `bg-hint`                                                | —                                         | Etiqueta visible siempre; el placeholder solo pone ejemplos.                                                                                                                                                                                  |
| **Opción seleccionable** | `bg-choice` (+`bg-choice-checked`)                                                 | —                                         | `radio` nativo dentro de `label`. Se usa en listas largas con buscador; con menos de 7 opciones, radios sin buscador.                                                                                                                         |
| **Aviso**                | `bg-callout bg-callout-{info,warning,danger,success,neutral}` + `bg-callout-title` | `Callout`                                 | `warning` = «lee esto antes de seguir»; `danger` = errores (con `role="alert"`); `neutral` = texto legal.                                                                                                                                     |
| **Bloque oficial**       | `bg-eyebrow`                                                                       | `OfficialDivider`                         | Separa el panel del contenido oficial: «Información oficial de esta página».                                                                                                                                                                  |
| **Aviso de fallback**    | `bg-card shadow-raised`                                                            | `FallbackNotice`                          | Esquina inferior izquierda, se puede cerrar y no bloquea nada.                                                                                                                                                                                |

## 4. Cómo se viste la web oficial

Mientras la interfaz está activa, el runtime (`packages/runtime`) añade `data-bg-site="<portal>"` y `data-bg-page="<pantalla>"` al `<html>` e inyecta los `pageStyles` de la pantalla. Al pulsar «Ver original», desactivar el portal o si falla un control oficial, **se quita todo** y la página vuelve a ser la original.

### 4.1 Qué se re‑estiliza

| Zona oficial                                                                 | Se muestra como                                                                                        |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Fondo, tipografía y color del texto                                          | `canvas`, `bg-text`, `ink`                                                                             |
| Cabecera (logotipos oficiales, título de la sede y menú)                     | Barra blanca con borde; los **logotipos oficiales se mantienen** intactos y el menú pasa a texto `ink` |
| Migas de pan y rótulos                                                       | `bg-small` / `bg-eyebrow`                                                                              |
| Título oficial de la página («CITA PREVIA EXTRANJERÍA»)                      | `bg-eyebrow`: queda como rótulo sobre el panel                                                         |
| Contenedor principal y barra lateral                                         | `bg-card`                                                                                              |
| Títulos oficiales (`h2`, `h3`, `.mf-paragraph-header`)                       | `bg-h2` / `bg-h3`                                                                                      |
| Párrafos y listas                                                            | `bg-text`, `max-width: 70ch`                                                                           |
| Enlaces                                                                      | `bg-link`                                                                                              |
| Notas (`.mf-note`) y listas de avisos                                        | `bg-callout-warning` o `bg-callout-neutral`                                                            |
| Aviso de protección de datos (`fieldset` con estilo inline)                  | `bg-callout-neutral`                                                                                   |
| Texto en rojo inline (`style="color: red"`)                                  | `danger-fg`: **se mantiene el énfasis**                                                                |
| Errores oficiales (`.error_list`, `.mf-msg__error`)                          | `danger-fg`                                                                                            |
| Botones oficiales (`.mf-button`, `input[type=submit]`, `input[type=button]`) | `bg-btn` primario o secundario                                                                         |
| Campos oficiales (`select`, `input`)                                         | `bg-field`                                                                                             |
| Opciones con/sin Cl@ve (`.mf-button__primary/secondary` en `acInfo`)         | `bg-card` interactiva                                                                                  |
| Barra de cookies                                                             | Tarjeta fija abajo con botones `bg-btn`. **No se oculta ni se acepta.**                                |
| Pie                                                                          | `bg-small` sobre `surface`                                                                             |

### 4.2 Controles oficiales duplicados

Si un panel ofrece un control sincronizado con uno oficial (el desplegable de provincias, el de oficinas, el de trámites o el botón «Aceptar»), el tema puede ocultar **solo ese control oficial** mientras el panel está montado. Nunca se ocultan:

- mensajes de error ni sus contenedores,
- avisos, notas, textos legales ni requisitos,
- controles oficiales que el panel no replica (p. ej. `#divSubTramites`),
- nada en pantallas que el portal no tenga registradas.

«Ver original» (barra comunitaria o popup) y «Desactivar en este portal» los recuperan al instante.

### 4.3 Lo que nunca hace un tema

- `display: none`, `visibility: hidden` u `opacity: 0` sobre contenido informativo (solo se permite en controles duplicados, §4.2).
- Truncar texto (`line-clamp`, `text-overflow`), cambiar el orden del contenido oficial o bajar de 14 px.
- Cambiar o tapar los logotipos institucionales, o imitar la identidad de la Administración en elementos propios.
- Pintar botones propios con apariencia de botón oficial fuera del panel.

## 5. Contenido y tono

- **Tú**, frases cortas y verbos en imperativo amable: «Elige la provincia», «Lee los avisos oficiales».
- Atribuye siempre: «según la web oficial», «la web oficial indica».
- No prometas nada: nunca digas «hay citas», «es rápido» ni «tendrás cita». Tampoco inventes requisitos, plazos ni documentos.
- Nombra las cosas como la web oficial («Presentación sin Cl@ve»), aunque suenen raro, para que la persona las reconozca.
- Los números de paso, en cifras: «Paso 2 de 5».

## 6. Accesibilidad (lista de comprobación)

- [ ] Contraste AA en texto (4.5:1) y bordes de controles (3:1).
- [ ] Foco visible: contorno de 3 px `brand-600` con separación de 2 px en botones y enlaces, y anillo de 3 px `brand-200` más borde `brand-600` en campos.
- [ ] Objetivos táctiles de al menos 44 × 44 px.
- [ ] Controles nativos (`button`, `select`, `input[type=radio]`, `fieldset`/`legend`).
- [ ] Un solo `h1` visual por panel; en el HTML el panel usa `h2`, porque la página oficial ya tiene su `h1`.
- [ ] Cambios dinámicos anunciados con `aria-live` o `role="alert"` (errores oficiales).
- [ ] Sin scroll horizontal a 375 px.
- [ ] Se respeta `prefers-reduced-motion`.

## 7. Cómo añadir o cambiar algo

1. ¿Existe ya un token o componente? Úsalo.
2. Si no existe, añádelo **aquí primero** (tabla correspondiente), después en `tokens.css` o en el preset, y por último úsalo.
3. Revisa el resultado con `npm run site:preview -- <portal>`, que reproduce una visita grabada con `site:record` sin conexión y guarda capturas a 1280 y 390 px en `.cache/preview/<portal>/`. Para los campos conectados, usa el laboratorio (`npm run dev`).
4. Un PR que cambie el diseño debe incluir capturas y, si toca tokens de color, el contraste medido.
