# Regresión: «como me monto una SL»

Detectada mediante una captura real del usuario el 30-09-2026.

## Causa

La comprensión de consultas confundía «no coincide con mi lista de temas» con «pregunta ambigua». Finalizaba antes de embeddings, retrieval o generación, de ahí los 0,0 segundos de la captura. Además, la guía del Punto de Acceso General no estaba indexada y la heurística de contenido principal de Firecrawl extraía una tabla vacía de esa página.

## Corrección

- Una consulta con un tema concreto pasa a retrieval aunque no encaje en las heurísticas de organismos. Las consultas sin tema y las que necesitan ubicación siguen pidiendo contexto.
- SL, S.L., SRL y sociedad limitada aportan términos de búsqueda de constitución de empresas. No se incorpora una respuesta fija.
- El adapter del PAG extrae su región `main` y elimina el menú anterior al artículo. La guía oficial está indexada con el ID `fa5f7dd908537138e0b5561b` y 12 chunks.
- La interfaz distingue una aclaración y la falta de evidencia de una respuesta citada.

Fuente: [Crear una empresa — Punto de Acceso General](https://administracion.gob.es/tu-espacio-europeo/derechos-obligaciones/empresas/inicio-gestion-cierre/registro-cambio-cierre/crear).

## Comprobación

`pnpm eval --dataset regressions --mode live --judges --publish`

Ejecución `a5043abc-fbed-4423-9ad8-aec39fcb6962`: seis casos, sin fallos. Las tres formulaciones sobre SL recuperan la guía y responden con CIRCE y DUE; dos consultas ambiguas piden contexto y una consulta sobre saldo bancario se abstiene. Recall@1, integridad de citas, fidelidad y completitud: 100% en los elementos evaluables de este conjunto pequeño, propuesto y pendiente de revisión humana. No implica calidad del 100% para todo el producto.

Verificado también en el navegador con la pregunta exacta: respuesta citada en 15,2 segundos. Tipos, 79 pruebas Vitest y build de producción correctos. El dataset principal y los expected outputs del golden no se modificaron. Las credenciales y las protecciones de evidencia se mantienen.

## Comprobación del conjunto anterior

Se repitieron los 50 candidatos golden con jueces: ejecución `fcd35660-60e5-4c82-83b6-aae767cb08e7`, sin errores de ejecución y con corpus estable. Recall@5 sigue en 100% para los 30 casos con documento de referencia y jurisdicción incompatible en 0%. La evaluación de respuestas registra fidelidad 98,6%, precisión de citas 94,6%, completitud 71,3% y decisión de abstención correcta 94%.

La precisión de citas queda por debajo del umbral del 97%; también persisten fallos críticos. No se aprobó ni se sustituyó el baseline. Los fallos de esa ejecución no citan el nuevo documento de creación de empresas; esta observación no demuestra ausencia de regresiones ni elimina la variabilidad de generación y jueces. La corrección de SL está comprobada, pero no certifica la calidad global del servicio. Los detalles por caso se conservan en el informe y el laboratorio.
