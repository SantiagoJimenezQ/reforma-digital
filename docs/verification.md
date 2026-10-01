# Verificación del MVP — 30 de septiembre de 2026

Actualización posterior: [corrección de la consulta sobre crear una SL](sl-regression.md), con 79 pruebas y un conjunto adicional de seis regresiones. Las cifras de las ejecuciones originales siguientes se conservan como histórico.

## Estado

Aplicación local operativa con el build de producción de Next.js, PostgreSQL/pgvector y llamadas reales mediante la nueva clave de Vercel AI Gateway. No se ha desplegado públicamente ni se ha aprobado como servicio de producción.

- Nueve organismos registrados; 38 documentos consultables y 1.755 fragmentos. El resto de páginas capturadas fuera del alcance permanece fuera del índice.
- 150 casos versionados; 50 candidatos a golden, 0 revisados por una persona. Hay referencias documentales propuestas para 30 de esos 50 y para 62 de los 150.
- 65 pruebas Vitest, tipos en los nueve paquetes y build de Next.js: correctos.
- Diagnóstico real: PostgreSQL/pgvector, embeddings de 1.536 dimensiones, Firecrawl y Langfuse autenticados.
- Comprobadas en navegador las consultas, estados de progreso, fragmentos citados, enlaces oficiales y feedback. Comprobados el acceso protegido al laboratorio y el diseño móvil sin desbordamiento horizontal.
- Una valoración negativa de prueba se exportó a la cola de revisión; está identificada expresamente como prueba funcional y no se convirtió automáticamente en golden.

## Ejecuciones reproducibles

Los informes completos están en PostgreSQL, en el laboratorio interno y en archivos locales de artifacts/runs. Contienen consultas, evidencias, respuestas, fallos, trazas, modelos, costes y hashes. Las trazas y los experimentos publicados también se comprobaron en Langfuse.

| Ejecución | Alcance | Observación |
| --- | --- | --- |
| b6e8571b-283e-459d-9ca2-ba078b7b4e31 | 50 candidatos golden, respuestas y jueces | Baseline provisional conservado, no aprobado |
| fefd0a40-56be-47ae-a642-2e1f6abb1422 | 50 candidatos, ventana de recuperación mayor | No mejoró la completitud; no se adoptó esa configuración |
| 06831d56-ab75-48d3-a1f9-8066bfd79f4f | 150 casos, solo retrieval | Recall@5 93,5% sobre los 62 casos con referencia; jurisdicción incompatible 0%; corpus anterior a las últimas cinco incorporaciones |
| 8eda558a-4b31-4b8b-875d-8e2a6fe3f94b | 50 candidatos, corpus de 38 documentos | Completitud 81,3%, precisión de citas 97,4%, decisión de abstención 98%; anterior al ajuste de diversidad |
| 1b57473e-be73-4b77-afc1-3fc96e2250b1 | 50 candidatos, variante de diversidad | Ranking mejor, pero completitud 79,2%, decisión de abstención 90% y más fallos críticos: no adoptada |

La selección activa conserva el comportamiento de la ejecución 8eda: 2 fragmentos como máximo por documento, ventana de reranking por score y prompt original. La variante posterior se conserva desactivada en `packages/evals/configs/diverse-reranking.json`; incluye reserva por organismo, expansión censal de la consulta de autónomos, prompt específico y 4 evidencias por documento. No se presentó una mejora de ranking como mejora global del producto.

| Métrica | Configuración conservada (8eda) | Variante descartada (1b574) |
| --- | ---: | ---: |
| Recall@1, sobre 30 casos con referencia | 80,0% | 86,7% |
| Recall@5, sobre 30 casos con referencia | 100,0% | 100,0% |
| MRR | 0,894 | 0,933 |
| Jurisdicción incompatible | 0% | 0% |
| Fidelidad entre claims evaluables | 100% | 100% |
| Precisión de citas | 97,4% | 99,4% |
| Cobertura de citas | 97,5% | 87,5% |
| Completitud | 81,3% | 79,2% |
| Decisión de abstención correcta | 98,0% | 90,0% |
| Casos críticos con fallos | 1 | 4 |
| P95 de latencia del producto | 15,10 s | 13,52 s |
| Coste medio por consulta, sin jueces offline | $0,00604 | $0,00618 |

La última ejecución confirmó que el corpus permaneció estable. Las comparaciones contra el baseline inicial advierten que también cambiaron código y corpus: no atribuir sus deltas exclusivamente a un parámetro. Los resultados incluyen variabilidad de modelos y jueces; una única ejecución no establece significación estadística.

No comparar estas cifras como si midieran un golden aprobado. Recall se calcula solo donde existen documentos de referencia; la fidelidad y precisión de citas se calculan entre elementos evaluables. Una abstención no demuestra fidelidad. El evaluador metrics-v2 corrigió una comprobación anterior de completitud; los informes con otra versión no son comparables.

## Puerta de calidad y trabajo pendiente

La aprobación falla deliberadamente si falta revisión humana, documentos gold en casos respondibles o baseline aprobado, o si hay fallos críticos, errores de ejecución o métricas por debajo de los umbrales. No se relajaron umbrales para obtener un resultado verde. La suite determinista está configurada para cada PR; las regresiones reales requieren habilitar el entorno de CI con una base de evaluación independiente.

La principal limitación de calidad es la cobertura y selección de evidencia útil: una página oficial puede contener una descripción general sin todos los pasos, condiciones o canales necesarios. Las consultas sobre DNI, cita de renta y trámites con varios organismos requieren revisar sus resultados concretos, completar evidencia cuando falte y mantener los casos como regresiones. Los jueces semánticos también necesitan calibración humana; sus resultados no certifican exactitud legal.

El golden debe revisarse por una persona identificada, completarse y versionarse antes de aprobarlo. El comando de aprobación comprueba esas condiciones y nunca reescribe expectativas. Antes de publicar el servicio hacen falta la base y secretos de producción, la política de retención y el contacto del responsable de privacidad.

No se hizo commit ni push. Los scripts auxiliares locales de diagnóstico se retiraron; no se conservaron cambios de harness ni dependencias para falsear la verificación.
