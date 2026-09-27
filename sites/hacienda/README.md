# hacienda

Subproyecto preparado, todavía sin interfaces implementadas. enabled: false lo excluye del código y de los permisos de la extensión.

## Organización

- src/pages/<pantalla>/page.tsx: interfaz y preparación de esa pantalla.
- src/pages/<pantalla>/bindings.ts: conexiones exactas con los controles originales.
- src/pages/index.ts: registro de pantallas.
- src/components/: componentes propios compartidos.
- src/styles/: estilos propios.
- fixtures/: HTML de prueba sin datos personales.
- tests/: pruebas de rutas y comportamiento.

Antes de activar el portal, define sus dominios exactos, implementa al menos una pantalla y documenta qué has verificado. Consulta ../../CONTRIBUTING.md.
