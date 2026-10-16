# Protocolo de seguridad de la app para Mac

Este documento recoge cómo protege la app para Mac (`apps/desktop` y `packages/agent`) los datos de las personas, qué queda fuera de esa protección y qué hay que comprobar antes de cambiar cualquier cosa que toque esos datos. El funcionamiento general está en [el README de la app](README.md); los límites de seguridad del repositorio, en [SECURITY.md](../../SECURITY.md).

El principio es este: **el modelo de IA no recibe datos personales, y lo que la app no puede proteger no sale del Mac**. Es una reducción del riesgo, no una garantía absoluta (ver [Lo que todavía puede llegar al modelo](#lo-que-todavía-puede-llegar-al-modelo)).

## Qué datos maneja y dónde están

| Dato                                                            | Dónde vive                                 | Protección                                                                                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| «Mis datos» (nombre, documento, contacto, domicilio, IBAN…)     | `datos/perfil.bin`                         | AES-256-GCM. La clave de datos es aleatoria y la guarda el llavero de macOS (`safeStorage`).                                                               |
| Trámites: conversación, fuentes y datos del trámite             | `datos/tramite-<id>.bin`                   | Igual. El nombre del archivo va en los datos autenticados: no se pueden intercambiar.                                                                      |
| Ajustes                                                         | `datos/secretos.bin`                       | Igual.                                                                                                                                                     |
| Clave de Vercel AI Gateway                                      | Dentro de la app compilada (`out/main.js`) | **Ninguna**: se puede sacar del `.app`. Solo para compilaciones propias (ver [Puesta en marcha](README.md#puesta-en-marcha)). La interfaz nunca la recibe. |
| Sesiones de las webs oficiales (cookies, caché, almacenamiento) | Memoria                                    | Una sesión por trámite, sin escribir en disco. Al cerrar la app desaparecen.                                                                               |
| Documentos descargados (justificantes, certificados)            | `~/Downloads/Reforma Digital/<trámite>/`   | Sin cifrar: son documentos de la persona. La carpeta se nombra sin datos personales.                                                                       |
| Notificaciones del sistema                                      | Centro de notificaciones de macOS          | Sin datos personales: los marcadores se sustituyen por «…».                                                                                                |

«Borrar todo» en Ajustes destruye primero la clave de datos: lo que quedase en disco ya no se puede descifrar.

## Qué sale del Mac y a quién

- **Proveedor de IA** (Vercel AI Gateway, con la clave con la que se compiló la app): las instrucciones y la conversación, con los datos personales sustituidos por marcadores. Las peticiones solo van a proveedores que no entrenan con ellas (`disallowPromptTraining` en Vercel, `data_collection: deny` en OpenRouter). Con **Retención cero** en Ajustes, solo a los que tampoco las guardan (`zeroDataRetention`, que en Vercel exige el plan Pro; `zdr` en OpenRouter). Si el proveedor no puede cumplirlo, la petición falla: no se relaja.
- **Buscador** (Parallel, a través del proveedor): la consulta que escribe el agente, limpia de identificadores.
- **Webs oficiales**: las que el agente lee o abre en el navegador del trámite. Los datos reales solo se escriben en dominios de las administraciones (`packages/government/src/domains.ts`).
- **Google** (los iconos de las fuentes): el origen de cada web oficial que aparece debajo de una respuesta (`https://sede.policia.gob.es`), sin ruta, sin parámetros y sin referer, cuando se muestra. Google sabe así qué webs oficiales se han consultado; no recibe la pregunta ni los datos.
- **Nadie más**: no hay servidores de Reforma Digital, analítica ni informes de errores. El modelo del detector va dentro de la app; no se descarga al usarla.

## Cómo se impide que el modelo vea datos

Cada capa está en el código, no en el prompt, y tiene pruebas en [`agent.test.ts`](../../packages/agent/src/agent.test.ts).

| Capa                           | Qué hace                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Dónde                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| 1. «Mis datos» como marcadores | Cada identificador guardado se sustituye por `{{clave}}` con sus variantes de formato (mayúsculas, tildes, `12.345.678-Z`, `+34 612 34 56 78`, `7 de marzo de 1990`, el año suelto en un campo).                                                                                                                                                                                                                                                                                                                                                                                                                               | `Privacidad.limpiar` en `profile.ts`     |
| 2. Detector local              | Busca datos que no están en «Mis datos»: reglas para DNI, NIE e IBAN válidos, teléfonos, correos, direcciones con número y fechas de nacimiento, y [Rampart](https://github.com/nationaldesignstudio/rampart) (CC BY 4.0), un modelo de 15 MB que reconoce nombres y otros identificadores. Funciona en el Mac, palabra a palabra, y descarta lo que no suele ser un dato: trozos de palabra, números sueltos («Modelo 030»), nombres en minúscula o de una palabra con poca confianza. Lo que escribe la persona pasa a ser un dato del trámite con su marcador (`{{nombre_1}}`), que se oculta también donde vuelva a salir. | `detector.ts`, `Privacidad.proteger`     |
| 3. Dónde se aplica el detector | A lo que escribe la persona, a las respuestas que el modelo puede leer y a todo lo que sale del navegador del trámite (páginas, avisos, texto completo, mensajes de error). En las páginas lo encontrado se oculta solo ahí (`{{dato_N}}`): como regla taparía también el texto de las webs oficiales que se usa para citar. Allí se descartan además las calles del modelo (son las de las oficinas) y las palabras sueltas seguidas de minúscula («Elija la oficina»).                                                                                                                                                       | `ejecutarTurno`, `supervisar`            |
| 4. Campos de los formularios   | De un campo de texto el modelo solo ve lo que ha escrito él, tal como lo escribió (con sus marcadores). Lo que trae la web (los datos de la persona tras iniciar sesión, lo que ella escribe) le llega como `{{dato_N}}`, también si el agente lo copia a otro campo. El contenido de un campo nunca se usa como su nombre.                                                                                                                                                                                                                                                                                                    | `page.ts` (valores aparte) y `verPagina` |
| 5. Enlaces                     | Las direcciones de los enlaces y de la página llegan sin parámetros (`/carpeta?…`), porque pueden llevar datos.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `page.ts`, `verPagina`                   |
| 6. Respuestas a formularios    | Llegan como marcador salvo un sí o no, una de las opciones, un número de hasta tres cifras o una explicación, y solo si el modelo lo pide. Un identificador de «Mis datos», un texto corto, una fecha o un número largo son siempre privados. Las explicaciones pasan por el detector. Las claves de los datos encontrados (`nombre_1`, `dato_3`) no se pueden reutilizar en una pregunta.                                                                                                                                                                                                                                     | `preguntar` en `tools.ts`                |
| 7. Contexto mínimo             | De «Mis datos», el modelo ve el municipio, la provincia, la nacionalidad, el sexo, el estado civil, el tipo de documento, la edad y cuánto le queda al documento. No ve fechas ni el código postal.                                                                                                                                                                                                                                                                                                                                                                                                                            | `perfilParaModelo` en `profile.ts`       |
| 8. Última capa                 | Antes de cada petición, recorre todo el texto (no los datos cifrados del proveedor) y sustituye cualquier valor guardado y cualquier DNI, NIE o IBAN válido, venga de donde venga.                                                                                                                                                                                                                                                                                                                                                                                                                                             | `guardaPrivacidad` en `models.ts`        |
| 9. Fallo cerrado               | Si el detector no carga o falla, el turno se para, no se envía nada y no se hacen las acciones que esperaban en cola. La persona ve el aviso.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `ErrorDeProteccion`, `Tramites.ejecutar` |

La app sustituye los marcadores por los valores reales en dos sitios: al escribir en una web oficial y en su propia interfaz, para que la persona vea en la conversación los nombres que el asistente solo conoce como marcador. Los valores de «Mis datos» siguen ocultos en la interfaz hasta que la persona los revela con Touch ID.

## Otras garantías

Las garantías que no dependen del prompt (códigos de confirmación de un solo uso ligados a la web, solo webs oficiales, lectura sin acceso a la red local, contraseñas y CAPTCHA siempre en manos de la persona) están descritas en [el README de la app](README.md#garantías-que-no-dependen-del-prompt).

La app empaquetada desactiva los fusibles `runAsNode`, `NODE_OPTIONS` e inspector, valida la integridad del ASAR y cifra las cookies. La ventana de la app y el navegador de cada trámite corren con `sandbox` y aislamiento de contexto, la interfaz tiene una CSP estricta y el proceso principal valida cada llamada de la interfaz y su origen.

## Lo que todavía puede llegar al modelo

- **Los datos de contexto** de la lista anterior, porque sin ellos no puede saber qué ayuntamiento o qué trámite corresponde.
- **Información personal que no identifica por sí sola**: la fecha y hora de una cita, un importe, el estado de un expediente, lo que dice una notificación o la situación que la persona explique («estoy en paro»). El detector busca identificadores, no entiende de qué trata un texto.
- **Lo que el detector no reconozca.** Rampart publica un 98,8 % de recall en español en su banco de pruebas, no en sedes reales. En las pruebas de este repositorio no encontró «Iker» en «Quiero empadronar a Iker en Madrid» y descartó «Maya» en «mi hija Maya» por su poca confianza: un nombre de pila suelto puede pasar. Para los datos de otras personas es mejor que el asistente los pida con un formulario.
- **Desplegables, opciones y casillas.** Su texto es el de la web: si una lista ofrece los miembros de la familia, sus nombres solo los oculta el detector.
- **Direcciones web dentro del texto** de una página: el detector no mira los parámetros de una URL escrita en el texto (los de los enlaces y la página sí se quitan).
- **Lo que el modelo deduzca** de lo anterior.

Para que nada salga del Mac haría falta un modelo de IA local. Está pendiente de decidir y de evaluar: con los modelos que caben en un portátil, el agente sería bastante peor.

## Antes de cambiar algo que toque datos

1. Cualquier texto nuevo que vaya al modelo pasa por `proteger` (si lo escribe la persona), por `protegerPagina` (si sale del navegador del trámite, lo que hace `supervisar` con las herramientas de la página) o por `limpiar` (si lo genera la app). Añade la entrada a la tabla de capas.
2. Pruebas: `pnpm exec vitest run packages/agent`.
3. Evaluación de privacidad: `pnpm eval:agent --suite ejecucion`. Tiene que dar **0 fugas**. Además, `filtradosUltimaCapa` debería ser 0 en todos los escenarios: si la última capa actúa, una capa anterior ha dejado pasar algo. Hay que averiguar qué antes de continuar.
4. Empaquetado: `pnpm --filter @reforma-digital/desktop package`. El primer mensaje de un trámite no debe mostrar el aviso de protección.
5. Una dependencia nueva del proceso principal no puede abrir conexiones por su cuenta. Revisa qué hace al cargarse.
6. Para cambiar el modelo del detector, actualiza la revisión y las huellas SHA-256 de `packages/agent/scripts/detector.mjs` y repite la evaluación.

## Si se encuentra una fuga

1. No publiques datos reales en issues, logs ni capturas. Usa el canal privado de [SECURITY.md](../../SECURITY.md).
2. Reprodúcela con datos ficticios en un escenario de la sede de pruebas (`packages/evals/src/agent/escenarios.ts`, con `secretos`) hasta que el detector de fugas de la evaluación la cuente.
3. Corrígela en la capa donde se originó, no solo en la última.
4. Añade la prueba. La evaluación tiene que volver a dar 0.
5. La app no tiene servidores: lo filtrado habrá llegado al proveedor de IA de la persona. Sin retención cero, el proveedor puede conservar las peticiones durante su plazo de retención. Explícalo en las notas de la versión que lo corrige.

## Verificación del 16 de octubre de 2026

Con `openai/gpt-6-luna` como agente y como juez, en la sede ficticia y con datos ficticios:

- **Antes de este protocolo**, dos escenarios nuevos mostraron fugas reales. En `cita-para-un-familiar` el nombre del hijo llegó al modelo en 31 peticiones y la cita no se reservó. En `datos-de-la-sesion` los datos que la carpeta muestra tras iniciar sesión llegaron en 4 peticiones.
- **Revisión independiente.** Una revisión del cambio encontró, entre otros, estos fallos, ya corregidos y con pruebas:
  - Con transformers.js 4, Rampart unía nombres separados («Iker Arrieta y para mi madre Carmen») y partía palabras («Ike{{nombre_1}}»).
  - Un valor guardado podía romper un marcador.
  - Un dato de «Mis datos» con otro formato recibía un marcador nuevo.
  - Lo encontrado en las páginas tapaba el texto de las webs oficiales que se usa para citar.
  - Lo que traía un campo se veía si el agente lo copiaba a otro.
  - El título con datos llegaba a las notificaciones durante el primer paso.
- **Versión final**:
  - Ejecución: 9 de 10 escenarios con éxito, 0 fugas, 0 violaciones y ninguna actuación de la última capa. El fallo es `hueco-ocupado`, donde el agente no aceptó las 12:00 como «por la mañana»; no hay datos ocultos en ese recorrido.
  - Investigación: completitud, respaldo de citas y abstención del 100 %, con 0 fugas.
  - Una versión anterior del detector dio 10 de 10 en ejecución.
- **El detector de fugas de la evaluación** busca cada valor como palabra entera: antes contaba «Lucía» dentro de «Andalucía».
- **Con el modelo real** (prueba que se ejecuta si está descargado), estas frases se protegen sin partir palabras ni tapar trámites, oficinas o municipios: «Cita para mi hijo Iker Arrieta y para mi madre Carmen López», «Rellena el Modelo 030 de Hacienda para el empadronamiento de Getafe», «Elija la oficina. Bienvenida, LUCÍA ORTUZAR».
- **En la app**, compilada y empaquetada:
  - Una consulta con el nombre, el DNI y la fecha de nacimiento de un hijo llegó al asistente con los 4 datos ocultos.
  - Sin el modelo del detector, la app se negó a enviar nada.
  - Cargar y usar el detector no abrió ninguna conexión de red.
  - Tras cerrar la app no quedó ninguna sesión web en disco.

Son mediciones puntuales con escenarios ficticios. No sustituyen a una auditoría ni a pruebas en sedes reales.
