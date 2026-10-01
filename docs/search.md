# España, en claro

Buscador de trámites españoles con evidencias oficiales. Proyecto independiente, no una sede del Gobierno. La interfaz toma como referencia la composición de America.gov y la adapta a España.

## Puesta en marcha

Requiere Node 22+, pnpm 11 y PostgreSQL 17 con pgvector. `compose.yaml` ofrece una base local persistente en `127.0.0.1:5442`.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# Completar las credenciales en .env, sin subirlas al repositorio.
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm doctor
pnpm crawl --all --seeds-only
# Cambiar SEARCH_MODE a live y reiniciar Next.
pnpm dev
```

Buscador: <http://localhost:3000/composer>. Laboratorio protegido: <http://localhost:3000/admin/evals>. La clave del operador es `ADMIN_TOKEN` del entorno; nunca se incorpora al bundle del cliente. Generar `ADMIN_TOKEN` y `FEEDBACK_SECRET` con al menos 32 bytes aleatorios.

`SEARCH_MODE=preview` permite inspeccionar fragmentos de ejemplo sin credenciales. Se identifica como vista previa, no genera respuestas y no puede superar la puerta de calidad de producción. `SEARCH_MODE=live` usa PostgreSQL y llamadas reales a OpenRouter.

## IA y credenciales

Toda la IA usa **OpenRouter**, mediante Vercel AI SDK. No hace falta `OPENAI_API_KEY` ni una cuenta de proveedor directa:

- `OPENROUTER_API_KEY`: generación, embeddings, reranking y jueces.
- `FIRECRAWL_API_KEY`: descubrimiento y scraping fuera del ciclo de consulta.
- `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`: trazas, datasets y experimentos.
- `DATABASE_URL`: PostgreSQL con extensión `vector`.
- `APP_ORIGIN`: origen exacto del frontend, utilizado para comprobar peticiones de escritura.

Configuración inicial: `google/gemini-embedding-001`, 1536 dimensiones, tipos `search_query`/`search_document`; `openai/gpt-6-luna` con `reasoningEffort: "medium"` a través de OpenRouter para generación, reranker y jueces. Los importes de ejecución vienen de los metadatos reales de OpenRouter. Un coste desconocido se muestra como N/A, no como cero.

## Organización

| Directorio | Responsabilidad |
| --- | --- |
| `apps/web` | Next.js, React, Tailwind, API SSE, citas, feedback y laboratorio |
| `apps/worker` | Ingestión, indexación atómica, históricos y recrawls |
| `packages/government` | Nueve fuentes aprobadas, hosts exactos, jurisdicciones y alcance de descubrimiento |
| `packages/crawler` | Firecrawl v2, adaptador BOE, normalización y chunks por secciones |
| `packages/retrieval` | Comprensión de consulta, FTS español, pgvector y fusión RRF |
| `packages/ai` | Modelos OpenRouter, reranking, generación estructurada y comprobación de citas |
| `packages/evals` | Dataset versionado, métricas, jueces, CLI, informes y baseline |
| `packages/db` | Esquema Drizzle y migraciones SQL versionadas |
| `packages/core` | Tipos, esquemas Zod y configuración experimental |

## Ingestión y alcance

Solo se indexan hosts HTTPS explícitamente aprobados de PAG, BOE, AEAT, Seguridad Social/Importass, DGT, SEPE, Educación, Comunidad de Madrid y Ayuntamiento de Madrid. La consulta del usuario **no hace búsquedas web** ni llama a Firecrawl.

Para webs, el worker usa `map` con sitemap incluido, clasifica URL/título/descripción, aplica los ámbitos por organismo, deduplica y hace scrape. La canónica y la URL final deben seguir perteneciendo a la fuente. El BOE usa su API de legislación consolidada y metadatos; selecciona versiones publicadas y vigentes, no versiones futuras.

```sh
pnpm crawl --source seg-social --seeds-only  # núcleo acotado y reproducible
pnpm crawl --source dgt --max-pages 30      # descubrimiento restringido
pnpm crawl --due                           # recrawls pendientes
pnpm crawl --source boe
pnpm crawl --all --reindex --config packages/evals/configs/baseline.json
```

El contenido se divide respetando encabezados, párrafos, listas y tablas, alrededor de 600 tokens estimados y hasta 70 de solapamiento. Cada chunk conserva título, sección y vínculo al documento. Se retira chrome conocido de los portales sin modificar las reglas del trámite.

El hash de contenido evita reembeddings si no cambia ni contenido ni configuración de indexación. Una actualización archiva la versión anterior y sustituye chunks y vectores dentro de una transacción. Solo un 404/410 confirmado marca una página como no disponible; timeouts, 429 y fallos del proveedor no se interpretan como eliminación. Las páginas fuera del alcance quedan en cuarentena (`indexable=false`).

`--stage-only` almacena contenido sin vectores, fuera del índice consultable. `--reindex` aprovecha contenido guardado; no equivale a una nueva visita a la web. Cambiar embeddings o tamaño de chunk exige reindexar **una base de evaluación aislada**. No mezclar modelos en el índice ni reindexar mientras se ejecuta una comparación.

## Recuperación y respuestas

Etapas exportadas y evaluables: `understandQuery`, `retrieveCandidates`, `fuseCandidates`, `rerankCandidates`, `generateAnswer`, `search`.

1. Extraer intención, términos, organismos probables y ubicación explícita. Pedir contexto cuando sea imprescindible.
2. Ejecutar FTS y pgvector en paralelo, 40 candidatos de cada uno, ya filtrados por jurisdicción, modelo, disponibilidad y período.
3. Fusionar por rangos RRF y añadir señales acotadas de autoridad, organismo, título y frescura.
4. Rerankear semánticamente 20 candidatos y entregar hasta 8 evidencias, con un máximo de 2 por documento. La configuración experimental `diverse-reranking.json` reserva candidatos de los organismos implicados y permite 4 fragmentos por documento; no está activada por defecto porque la evaluación detectó más fallos críticos.
5. Generar claims estructurados con referencias a IDs existentes. El servidor resuelve URLs y texto citado desde esos IDs; el modelo no puede inventarlos.
6. Validar con Zod, registro, jurisdicción y comprobador semántico de respaldo. Si una afirmación no supera los controles, abstenerse.

La conversación vive en la página principal `/`: el compositor inicia la respuesta sin navegar a otra pantalla; `/chat` solo redirige a `/` para enlaces antiguos. Mantiene las preguntas de seguimiento en memoria, sin introducir consultas en la URL. La API transmite etapas, evidencias y bloques completos mediante SSE conforme cada claim supera la validación de IDs, ámbito, fuente y respaldo semántico. La UI presenta estos bloques antes de recibir el resultado final; detener cancela la generación. No expone tokens ni fragmentos de JSON del modelo antes de verificar las citas. El prompt `evidence-v2` activa esta generación incremental; `evidence-v1` sigue disponible para comparar experimentos. Las preguntas anteriores se redactan en servidor y se usan solo para resolver el tema y las referencias de una nueva pregunta. El diálogo de cada cita muestra el fragmento, organismo, ámbito, URL canónica, fecha de captura y fecha de actualización cuando existe.

Una fecha de captura reciente **no demuestra** que una norma o un plazo sean actuales. Las preguntas sobre importes y convocatorias requieren la evidencia aplicable. El modelo puede abstenerse aunque el documento sea oficial. La detección de jurisdicción y período es básica; casos complejos deben seguir ampliándose mediante evals.

## Evaluación

El repositorio contiene 150 preguntas distintas: 50 comunes, 25 de jurisdicción, 15 ambiguas, 20 sin respuesta, 20 adversariales, 10 de frescura y 10 de citas. Hay 50 **candidatos** a golden, todavía con `review.status=pending`. Las referencias propuestas proceden del corpus inspeccionado; los casos sin documento de referencia se muestran como N/A para Recall/MRR, no se convierten en aciertos por compartir organismo.

**No hay un golden aprobado por una persona ni una certificación de calidad de producción.** No se ha inventado un revisor. El baseline inicial es real pero provisional (`approved=false`), y CI rechaza su uso como aprobación de producción.

```sh
pnpm eval                                  # dataset completo, modo del entorno
pnpm eval --dataset golden --judges
pnpm eval --dataset full --retrieval-only
pnpm eval --dataset regressions --judges    # fallos reales: creación de SL y controles
pnpm eval --category jurisdiction --judges
pnpm eval --dataset golden --judges --compare baseline
pnpm eval --dataset golden --judges --config packages/evals/configs/wider-retrieval.json --compare baseline
pnpm eval --dataset golden --judges --publish
pnpm eval --dataset golden --judges --ci --compare baseline --thresholds packages/evals/configs/thresholds.json
```

`--retrieval-only` no llama al generador de respuestas ni a sus jueces; mantiene el reranker semántico como parte de retrieval. `--mode preview --retrieval-only` es útil para comprobar el runner sin proveedores, pero no representa búsqueda híbrida real ni resultados de producción.

Los informes JSON/Markdown se guardan en `artifacts/runs/` y PostgreSQL. Incluyen commit, estado del árbol, hash del código de pipeline, versión/hash del dataset, hash del corpus, modelo, embeddings, reranker, prompt, configuración, latencias, tokens y costes. Comparar versiones/selecciones de dataset o evaluadores distintos produce un error. Cambiar código o corpus genera una advertencia expresa. Los informes actuales de trabajo pueden indicar `gitCommit=uncommitted` hasta crear el primer commit.

Antes de una evaluación real se comprueba que el modelo y la configuración de chunking coincidan con el índice. Si cambian los documentos o sus metadatos durante la ejecución, el informe se marca como inestable y no se permite usarlo para comparar ni superar la puerta de calidad.

Las métricas individuales incluyen Recall@1/3/5/10 (al menos un documento gold), MRR, nDCG con grados de relevancia, organismo, jurisdicción, autoridad, integridad y cobertura de citas, fidelidad, entailment, completitud, alucinaciones y abstenciones. Se muestran medias por caso evaluable y desglose por categoría; N/A queda fuera de la media. La cobertura documental del dataset, las abstenciones y los errores se exponen al lado de estas medias. Una fidelidad alta entre respuestas emitidas no compensa abstenerse demasiado.

Los jueces reciben consulta, respuesta, evidencia y facts, sin scores de otros jueces. Evalúan independientemente fidelidad, completitud, entailment de citas, jurisdicción, claridad, abstención y alucinaciones, con el razonamiento configurado (medium por defecto) y JSON validado; temperatura cero cuando se configura razonamiento `none`. El coste mostrado por consulta corresponde al producto (embedding, reranking, generación y verificación), excluye los jueces offline; estos también consumen OpenRouter y quedan trazados.

Los fallos muestran pregunta, fuentes/documentos esperados, ranking, respuesta, motivos, claims y trace ID. `/admin/evals` permite elegir un experimento para comparar, también si es provisional, sin ocultar esa condición.

### Revisión humana y aprobación

1. Abrir cada documento oficial de los 50 candidatos, comprobar jurisdicción y vigencia y completar los documentos/facts ausentes. No aprobar una expectativa solo porque coincide con una respuesta del modelo.
2. Registrar persona, fecha y notas en `review`, revisar los cambios en PR y cambiar la versión del dataset. Los expected outputs aprobados se modifican únicamente mediante revisión humana.
3. Ejecutar de nuevo el golden con jueces sobre un índice estable y revisar todos los fallos críticos.
4. Una persona puede ejecutar `pnpm eval:approve --run artifacts/runs/ID.json --reviewer "Nombre"`. El comando comprueba revisión, coherencia de expectativas y puerta de calidad; nunca modifica expected outputs.

`--save-baseline` solo guarda un baseline provisional y nunca sobrescribe uno aprobado. El operador debe conservar los informes previos al aprobar un nuevo baseline.

### CI

El workflow ejecuta typecheck, Vitest y build en cada PR. El job de regresión real usa el entorno `evaluations`, una base de evaluación separada, secretos OpenRouter/Langfuse y `LIVE_EVALS_ENABLED=true`. No entrega secretos a PRs de forks ni usa `pull_request_target`.

La puerta real falla ante errores, casos críticos fallidos, falta de revisión/documentos gold/baseline, caída de Recall@5 superior a 3 puntos, fidelidad o precisión de citas inferiores al 97%, o jurisdicción incorrecta superior al 3%. El dataset completo se puede ejecutar manualmente. Un baseline de 50 casos no se compara silenciosamente con 150; usar un informe completo compatible para ese contraste.

## Feedback y trazas

Las búsquedas guardan query redactada, retrieval y respuesta. El feedback está ligado a esa búsqueda con token HMAC y FK. Se comprueban origen, longitud y límite de peticiones. No se utilizan coordenadas del dispositivo ni cookies publicitarias. La redacción por patrones de DNI/NIE/IBAN/correo/teléfono reduce exposición, pero no garantiza anonimización.

```sh
pnpm feedback:export
```

Exporta los negativos pendientes a `artifacts/feedback/review-queue.json`, con evidencia, respuesta y trace. Un revisor determina categoría, facts, documentos y si debía responder; luego incorpora el caso al dataset versionado mediante PR. Nunca se promociona feedback automáticamente al golden. Hay una valoración local de prueba claramente identificada como tal.

Langfuse registra `query → understandQuery → embedding → retrieval (lexical, semantic) → fusion → rerank → generation → citation_verification`, con llamadas de modelo, inputs, outputs, uso y latencias. `--publish` sincroniza una versión inmutable por hash del dataset, crea un experimento y asocia métricas al trace original. Los jueces offline tienen sus observaciones de evaluación independientes.

## Despliegue y operación

- Frontend/API: proyecto Vercel con directorio raíz `apps/web` y acceso a los paquetes del monorepo. Instalar con pnpm y compilar Next. Mantener todas las claves en variables **del servidor**.
- Base: PostgreSQL administrado con pgvector y TLS. El usuario de ejecución debe tener acceso solo a las tablas necesarias; migraciones con credenciales de migración. No exponer la base local ni reutilizar su contraseña de desarrollo.
- Worker: proceso Node programado en la infraestructura del operador: `pnpm crawl --due`. Tiene lock por fuente y reintentos. No se añadió Trigger.dev ni un servicio adicional sin necesidad demostrada.
- Separar base y proyecto Langfuse de evaluación de producción; evitar datos personales en datasets versionados. Definir retención y eliminación de consultas/trazas, responsable y contacto de privacidad antes de publicar el servicio.
- Revisar costes, tiempos, cobertura del corpus, fallos críticos y permisos del operador. El estado del proyecto local no implica que esté desplegado públicamente ni que cumpla los umbrales.

## Verificación

El [informe de verificación local](docs/verification.md) recoge ejecuciones reales, limitaciones y el estado de la puerta de calidad.

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm doctor
```

Vitest cubre límites del registro, canónicas, jurisdicciones incompatibles, fusión, chunking, referencias forjadas, métricas, comparaciones incompatibles y puerta de regresión. Los fallos descubiertos en ejecuciones reales se convierten en regresiones específicas.

Fotografía de la portada: imagen de Madrid servida originalmente por Unsplash, `photo-1543783207-ec64e4d95325`, conservada localmente en `apps/web/public/madrid.jpg`. No se utilizan sellos de afiliación oficial ni datos simulados en el dashboard.
