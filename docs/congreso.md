# El Congreso en Reforma Digital

`/congreso` muestra las vistas nativas con el diseño de Pablo de la PR #127: portada blanca y cabeceras con el sol pixelado. La sección se abre desde los proyectos de la portada y el pie compartido, y sus vistas aparecen en el sitemap. Se eliminan el índice de revisión y las rutas temporales `/new-escanoabierto`.

La UI lee nuestro Postgres y la misma capa de validación que utiliza la ingesta. Se eliminan la app JavaScript independiente, los estilos y fuentes duplicados, los rewrites al servidor original, la configuración de Vercel del otro proyecto y los commits diarios de datos.

La arquitectura, las variables de entorno, el bootstrap, los trabajos programados, la API y los límites conocidos se documentan en [apps/ingestion/README.md](../apps/ingestion/README.md). No se incluyen datos descargados en Git.

## Procedencia

El diseño conserva la adaptación de Pablo (`cfbafad`) sobre la contribución de Jorge Garcelán y el recolector de [Escaño Abierto](https://github.com/jorgegarcelan/escano-abierto), revisión fijada en el runner. La licencia MIT se conserva en `apps/ingestion/LICENSE`.

Los datos elaborados por Escaño Abierto se atribuyen a ese proyecto y mantienen sus licencias de datos (CC BY 4.0; las encuestas conservan CC BY-SA 4.0). Cada fuente oficial mantiene sus propias condiciones. La licencia del código no sustituye las licencias de los datos.
