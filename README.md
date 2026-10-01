# Reforma Digital

Monorepo de interfaces comunitarias para páginas de la Administración. Una extensión de Chrome aplica los subproyectos incluidos en cada versión. Las interfaces se desarrollan con React, TypeScript y Tailwind, y siguen un único sistema de diseño ([DESIGN.md](DESIGN.md)).

La extensión funciona localmente. Los formularios, las sesiones y las solicitudes siguen perteneciendo a la web original. Solo se guarda la preferencia de activar o desactivar un portal.

## Organización

```text
apps/
  extension/                Extensión Chrome Manifest V3 y popup
  web/                      Landing Next.js, buscador, API y evaluaciones
  playground/               Laboratorio local con datos ficticios
packages/
  bridge/                   Conexiones con controles originales
  design/                   Sistema de diseño: tokens, componentes y temas (DESIGN.md)
  react/                    Componentes y hooks conectados
  registry/                 Contratos y selección de portales/pantallas
  runtime/                  Montaje, estilos compartidos y restauración
sites/
  dni/                      Cita previa DNI y pasaporte, experimental
  extranjeria/              Cita previa de Extranjería, experimental
  hacienda/                 Asistencia y Cita de la Agencia Tributaria, experimental
  registro-asociaciones/    Consulta pública de asociaciones, experimental
```

Cada portal es un workspace de pnpm y tiene la misma estructura:

```text
sites/<portal>/
  package.json
  site.config.json          Dominio, rutas, estado y activación
  src/
    adapter.ts              Entrada del subproyecto
    pages/
      index.ts              Registro de pantallas
      <pantalla>/
        page.tsx            Interfaz React de esa pantalla
        bindings.ts         Conexiones con la web original
    components/             Componentes propios compartidos
    styles/                 Estilos propios
  fixtures/                 Páginas de prueba sin datos personales
  tests/                    Pruebas del portal
  flow.ts                   Opcional: recorrido de la web real para site:live/record/preview
  README.md                 Cobertura y límites de la integración
```

El build descubre `sites/*/site.config.json`. Solo incluye los portales con `enabled: true`. Añadir un portal no requiere escribir condiciones específicas en la extensión. Todas las interfaces activadas se distribuyen dentro del mismo paquete de extensión, cada una en su propio content script que solo se inyecta en sus rutas. Cómo encaja todo: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Desarrollo

Requiere Node.js 22.18 o posterior y pnpm 11. Desde la raíz:

```sh
pnpm install --frozen-lockfile
pnpm dev:extension
```

Abre el laboratorio en `http://127.0.0.1:4173`. Usa datos ficticios. Permite editar controles React y originales, comparar sus valores, restablecer el formulario y comprobar qué recibe el formulario original. No reserva citas.

```sh
pnpm check         # Tipos, estructura, pruebas y compilación
pnpm exec playwright install chromium
pnpm test:e2e      # Pruebas de la extensión en Chromium
pnpm package      # ZIP instalable en artifacts/
```

La web pública y el buscador comparten una aplicación Next.js en `apps/web`. La portada presenta Reforma Digital como iniciativa y sus dos herramientas: un buscador de trámites y una extensión para mejorar las webs oficiales.

```sh
pnpm dev               # http://localhost:3000
pnpm landing:build     # Build de Next.js
pnpm build:extension   # Extensión en dist/
```

Rutas: `/` presenta el ensayo, con el buscador sobre la fotografía del hero. Al preguntar, el chat sustituye a la portada en la misma ruta; el logo vuelve al inicio y «Nueva conversación» abre un chat vacío. `/composer` y `/chat` redirigen a `/`. «Lee nuestra propuesta» baja a `/#texto`; `/propuesta` redirige allí por compatibilidad. `/explorar` conserva una portada alternativa, sin indexar. Las fuentes están en `/sources` y el laboratorio protegido en `/admin/evals`.

El chat utiliza Web Search de OpenRouter con GPT-6 Luna y razonamiento high. Con `OPENROUTER_API_KEY` configurada, la web usa la búsqueda real; `SEARCH_MODE=preview` selecciona los ejemplos locales. PostgreSQL es opcional para feedback e informes. Consulta [la puesta en marcha, arquitectura y evaluaciones del buscador](docs/search.md). La extensión sigue funcionando localmente y no depende de estos servicios.

Para trabajar con la web oficial real (ventana visible, un solo recorrido, nunca datos personales ni CAPTCHA):

```sh
pnpm site:live -- extranjeria      # Comprobaciones, capturas y fixtures desde la web real
pnpm site:record -- extranjeria    # Graba una visita para trabajar sin conexión
pnpm site:preview -- extranjeria   # Reproduce la grabación con la extensión y guarda capturas
```

Para cargarla en Chrome, ejecuta `pnpm build`, abre `chrome://extensions`, activa el modo de desarrollador y elige **Cargar descomprimida** con la carpeta `dist/`. El build de pruebas `dist-test/` añade acceso al servidor local; no se distribuye.

## Añadir un portal

```sh
pnpm site:new -- nombre-del-portal
pnpm install
```

El generador crea un workspace completo y desactivado. También admite un dominio HTTPS exacto y un prefijo de ruta como segundo y tercer argumentos. Se desarrolla dentro de su carpeta y se activa en `site.config.json` cuando sus rutas y conexiones estén preparadas. Lee [CONTRIBUTING.md](CONTRIBUTING.md).

## Migración local a Next.js

La base de esta integración es `origin/main` (`d0807b5`). La landing de Astro se ha trasladado a componentes React en `apps/web/landing`. Los componentes interactivos mantienen los filtros y la selección compartida de la demo. El grupo `(search)` sirve la portada y el buscador; la antigua página de propuesta se ha retirado.

Validado: instalación con lockfile congelado, typecheck, 146 pruebas, build de Next.js y extensión, auditoría de bundle y revisión del navegador en escritorio y móvil, incluida una consulta real y su cita. El check de estructura heredado de `main` falla porque exige `sites/registro-asociaciones/src/components`, que no está versionado en esa base; no se ha modificado el check para ocultarlo. No se han ejecutado los E2E de la extensión en esta migración.

## Estado real

La base se compila y dispone de pruebas unitarias y pruebas con la extensión cargada. El 10 de septiembre de 2026 se comprobó la extensión instalada en Chrome de pruebas sobre el portal oficial: se montaron los cinco campos React de identificación y se verificó que un valor ficticio introducido en la nueva interfaz llegaba al input original, sin enviar el formulario. La adaptación es parcial: quedan la maquetación antigua y alguna etiqueta duplicada. **No se ha validado el trámite oficial completo**. Las pantallas no reconocidas mantienen su interfaz original.

El 27 de septiembre de 2026 se recorrió la web oficial de cita previa de Extranjería con la extensión cargada: página informativa, provincia, oficina y trámite, e información del trámite con la elección con o sin Cl@ve (Madrid, «Toma de huellas»). La interfaz se detiene antes del formulario de datos personales. Sus fixtures son HTML real de esas páginas públicas. Consulta [la cobertura de Extranjería](sites/extranjeria/README.md).

El mismo día se comprobaron con la extensión cargada en su web real la cita previa del DNI con el tema completo del sistema de diseño, «Asistencia y Cita» y el catálogo de servicios de la Agencia Tributaria, y la consulta pública del Fichero de Denominaciones de Asociaciones. Todos terminan antes de pedir identificación o datos personales. Consulta [DNI](sites/dni/README.md), [Hacienda](sites/hacienda/README.md) y [Asociaciones](sites/registro-asociaciones/README.md).

CAPTCHA, audio, certificados, firma, archivos y controles de navegador se mantienen como controles originales. No se simulan ni se sustituyen genéricamente. Conservar esos controles no demuestra por sí solo que todos los flujos de un portal funcionen: cada integración requiere verificación. Consulta [SECURITY.md](SECURITY.md) y [la cobertura del DNI](sites/dni/README.md).

Código bajo licencia [MIT](LICENSE). Proyecto independiente, sin vinculación con la Administración.
