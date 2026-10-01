# OpenRouter y conversación en la página principal

Migración solicitada el 01-10-2026.

- Generación, verificación de claims, comprensión contextual, reranking y jueces usan `openai/gpt-6-luna` mediante el proveedor oficial de OpenRouter para Vercel AI SDK.
- `reasoningEffort` está en la configuración experimental y vale `medium` por defecto. Se transmite como `reasoning.effort`; se exige soporte de parámetros y se excluye el razonamiento interno del contenido de respuesta. Los traces registran proveedor y esfuerzo.
- `OPENROUTER_API_KEY` sustituye la dependencia de `AI_GATEWAY_API_KEY`; las credenciales existentes del usuario no se modificaron. El workflow utiliza el secreto de GitHub `OPENROUTER_API_KEY`, que debe configurarse en el entorno de evaluaciones para ejecutar CI live.
- Embeddings: `google/gemini-embedding-001`, 1536 dimensiones, `input_type=search_query/search_document`. La comparación puntual de ambos tipos frente a Gateway dio coseno ≈1, por lo que se conserva el índice. No se cambió el modelo de embeddings ni se recrawleó el corpus.
- El coste se lee de `providerMetadata.openrouter.usage.cost`; si falta permanece desconocido. No se infiere un precio a partir de tarifas estáticas.
- La portada inicia la conversación en `/` sin navegar. El logo y «Nueva conversación» reinician el estado local. `/chat` solo redirige a `/` para enlaces anteriores; se eliminó su UI propia y el contexto React utilizado para el traspaso entre rutas.

## Verificación

- Llamada real al modelo: salida estructurada válida con Luna medium; embeddings reales de 1536 dimensiones y coste real devuelto por OpenRouter.
- 98 tests Vitest, typecheck de nueve paquetes y build de producción correctos.
- Navegador: iniciar desde la portada conserva `http://localhost:3000/`, muestra «Pensando…» y mantiene los controles del compositor.
- Evals live, seis casos de producción: `8f930041-75e8-49f5-93a6-cecb9124c706`. Sin errores técnicos, recall y precisión de citas 100%, completitud 100%, fidelidad 88,9% y un caso señalado por el juez de fidelidad. No se aprobó el baseline ni se modificaron los expected outputs. Al cambiar también el modelo de los jueces, esta ejecución no aísla por sí sola el cambio de calidad del generador.

No se conservaron harnesses, logs ni configuraciones temporales para hacer pasar la comprobación. La dependencia nueva y el cambio del secreto en CI pertenecen a la migración de producción.
