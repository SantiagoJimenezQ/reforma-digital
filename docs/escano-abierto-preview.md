# Escaño Abierto en Reforma Digital

La PR adapta el diseño aportado en la PR #125 a componentes de Next.js y al sistema Sol compartido. `/new-escanoabierto` es el índice de revisión; `/new-escanoabierto/web` muestra las vistas nativas. Permanecen fuera de la navegación pública y declaran `noindex` hasta publicar el proyecto.

La UI lee nuestro Postgres y la misma capa de validación que utiliza la ingesta. Se eliminan la app JavaScript independiente, los estilos y fuentes duplicados, los rewrites al servidor original, la configuración de Vercel del otro proyecto y los commits diarios de datos.

La arquitectura, las variables de entorno, el bootstrap, los trabajos programados, la API y los límites conocidos se documentan en [apps/ingestion/README.md](../apps/ingestion/README.md). No se incluyen datos descargados en Git.

## Procedencia

El diseño parte de la contribución de Jorge Garcelán en `38c292f9118eded306d602881087f0d71ca4ed9e` y el recolector de [Escaño Abierto](https://github.com/jorgegarcelan/escano-abierto), revisión fijada en el runner. La licencia MIT se conserva en `apps/ingestion/LICENSE`.

Los datos elaborados por Escaño Abierto se atribuyen a ese proyecto y mantienen sus licencias de datos (CC BY 4.0; las encuestas conservan CC BY-SA 4.0). Cada fuente oficial mantiene sus propias condiciones. La licencia del código no sustituye las licencias de los datos.
