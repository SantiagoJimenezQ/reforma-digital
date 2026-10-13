import { z } from 'zod';

const count = z.number().int().nonnegative();
const date = z.iso.date();
const sourceUrl = z.url({ protocol: /^https$/ });
const group = z.object({
  nombre: z.string(),
  color: z.string().regex(/^#[\da-f]{6}$/i),
  escanos: count,
});
const deputy = z
  .tuple([
    z.string(),
    z.string(),
    z.string(),
    z.string(),
    z.string(),
    z.number().nullable(),
    z.number().nullable(),
    z.union([z.number(), z.string()]).nullable(),
    z.string(),
  ])
  .transform(([nombre, grupo, provincia, formacion, alta, x, y, codigo, baja]) => ({
    nombre,
    grupo,
    provincia,
    formacion,
    alta,
    x,
    y,
    codigo,
    baja,
  }));

export const indexSchema = z.object({
  meta: z.object({
    generado: date,
    datos_hasta: date,
    legislatura: z.string(),
    periodo: z.string(),
  }),
  grupos: z.record(z.string(), group),
  diputados: z.array(deputy),
  meses: z.array(
    z.object({
      mes: z.string().regex(/^\d{4}-\d{2}$/),
      sesiones: count,
      votaciones: count,
      intervenciones: count,
    }),
  ),
  hemiciclo: z.object({ ancho: z.number().positive(), alto: z.number().positive() }),
  agenda: z.object({
    plenos: z.array(z.object({ fecha: date, puntos: z.array(z.object({ titulo: z.string() })) })),
  }),
});

export const voteSchema = z.object({
  id: z.string(),
  fecha: date,
  tipo: z.string(),
  titulo: z.string(),
  texto: z.string(),
  proponente: z.string(),
  exp: z.string(),
  si: count,
  no: count,
  abst: count,
  novota: count,
  grupos: z.record(z.string(), z.string()),
  v: z.string().regex(/^[SNAX-]*$/),
  cg: z.record(z.string(), z.string()).optional(),
  tm: z.array(z.string()).optional(),
  json: z.union([sourceUrl, z.literal('')]),
});
const analysisSchema = z.object({
  provider: z.string(),
  model: z.string(),
  served_model: z.string().optional(),
  prompt: z.string(),
  input_sha256: z.string().optional(),
  cache_key: z.string().optional(),
});
export const sessionSchema = z.object({
  fuente: z.string().optional(),
  ia: analysisSchema.optional(),
  id: z.string(),
  fecha: date,
  organo: z.string(),
  sesion: z.string(),
  titular: z.string().optional(),
  resumen: z.string(),
  ds: sourceUrl.nullable(),
  puntos: z.array(z.object({ titulo: z.string(), tipo: z.string(), votos: z.array(z.string()) })),
});
export const interventionSchema = z.object({
  ia: analysisSchema.optional(),
  s: z.string(),
  item: z.union([z.string(), count]),
  orador: z.string(),
  g: z.string(),
  tono: z.string(),
  int: z.number(),
  temas: z.array(z.string()),
  cita: z.string().nullable().optional(),
  frase: z.string().optional(),
  resumen: z.string().optional(),
});
export const monthSchema = z
  .object({
    sesiones: z.array(sessionSchema),
    votaciones: z.array(voteSchema),
    intervenciones: z.array(interventionSchema),
    items: z.array(z.string()).optional(),
  })
  .superRefine((month, ctx) => {
    month.intervenciones.forEach((intervention, i) => {
      if (typeof intervention.item === 'number' && !month.items?.[intervention.item])
        ctx.addIssue({
          code: 'custom',
          path: ['intervenciones', i, 'item'],
          message: 'Asunto inexistente',
        });
    });
  });
export const lawsSchema = z.object({
  iniciativas: z.array(
    z.object({
      exp: z.string(),
      tipo: z.string(),
      titulo: z.string(),
      presentada: date,
      estado: z.string(),
      autores: z.array(z.string()),
      comision: z.string(),
      situacion: z.string(),
      etapa: count,
      bocg: z.union([sourceUrl, z.literal('')]),
      tm: z.array(z.string()),
      fases: z.array(z.tuple([z.string(), z.string(), z.string(), z.string()])),
    }),
  ),
  aprobadas: z.array(z.object({ titulo: z.string(), fecha: date, pdf: sourceUrl })),
});
export const questionsSchema = z.object({
  generado: date,
  total: count,
  estados: z.record(z.string(), count),
  grupos: z.record(z.string(), z.tuple([count, count, count])),
  diputados: z.record(z.string(), z.tuple([count, count, count])),
  demora: z.object({ n: count, mediana: z.number().nullable() }),
});
export const organsSchema = z.object({
  actualizado: date,
  cifras: z.object({ cargos_ocupados: count, ministerios: count, cambios_30: count }),
  cargos: z.record(
    z.string(),
    z.object({
      cargo: z.string(),
      ministerio: z.string(),
      mandatos: z.array(
        z.object({
          persona: z.string(),
          desde: date.nullable(),
          hasta: z.string().nullable(),
          boe: z.string().nullable(),
        }),
      ),
    }),
  ),
  cambios: z.array(
    z.object({
      fecha: date,
      tipo: z.string(),
      cargo: z.string(),
      persona: z.string(),
      boe: z.string(),
      cargo_id: z.string(),
    }),
  ),
});
export const weeksSchema = z.array(
  z.object({
    id: z.string(),
    desde: date,
    hasta: date,
    titular: z.string(),
    votaciones: z.array(z.string()),
    sesiones: z.array(z.string()),
    intervenciones: count,
    citas: z.array(
      z.object({ orador: z.string(), g: z.string(), cita: z.string(), s: z.string() }),
    ),
  }),
);
export const geographySchema = z.object({
  fuentes: z.record(z.string(), z.union([z.number(), z.string()])),
  provincias: z.record(
    z.string(),
    z.object({
      n: z.string(),
      pob: count,
      esc: count,
      renta: z.number(),
      edad: z.number(),
      dens: z.number(),
    }),
  ),
  ccaa: z.record(
    z.string(),
    z.object({ n: z.string(), pob: count, provincias: z.array(z.string()) }),
  ),
});
export const electionsSchema = z.object({
  convocatoria: date,
  votacion: date,
  decreto: z.object({ rd: z.string(), boe: z.string() }),
  calendario: z.array(z.object({ fecha: date, hito: z.string(), detalle: z.string().optional() })),
  escanos: z.record(z.string(), count),
});
export const pollsSchema = z.object({
  actualizado: date,
  eleccion: date,
  veda: z.tuple([date, z.string()]),
  fuente: sourceUrl,
  partidos: z.array(
    z.object({ id: z.string(), nombre: z.string(), color: z.string().regex(/^#[\da-f]{6}$/i) }),
  ),
  encuestas: z.array(
    z.object({
      empresa: z.string(),
      ini: date,
      fin: date,
      n: z.number().nullable(),
      v: z.record(z.string(), z.number()),
    }),
  ),
});
export const historySchema = z.object({
  elecciones: z.array(
    z.object({
      id: z.string(),
      fecha: date,
      censo: count,
      votantes: count,
      partidos: z.array(z.tuple([z.string(), z.string(), z.string(), count, count])),
    }),
  ),
});
export type CongressIndex = z.infer<typeof indexSchema>;
export type Vote = z.infer<typeof voteSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Intervention = z.infer<typeof interventionSchema>;
export type Law = z.infer<typeof lawsSchema>['iniciativas'][number];

// El resto de los conjuntos públicos conserva su contrato JSON original para descarga y reutilización.
export const jsonSchema = z.json();
export const datasetSchemas = new Map<string, z.ZodType>([
  ['indice.json', indexSchema],
  ['leyes.json', lawsSchema],
  ['preguntas.json', questionsSchema],
  ['organigrama.json', organsSchema],
  ['semanas.json', weeksSchema],
  ['geografia/territorios.json', geographySchema],
  ['elecciones/elecciones.json', electionsSchema],
  ['encuestas/encuestas.json', pollsSchema],
  ['elecciones/historico.json', historySchema],
]);
export function schemaForDataset(path: string) {
  return /^\d{4}-\d{2}\.json$/.test(path) ? monthSchema : (datasetSchemas.get(path) ?? jsonSchema);
}

export const topicSchema = z.record(
  z.string(),
  z.object({
    nombre: z.string(),
    preguntas: z.number(),
    leyes: z.array(z.string()),
    votos: z.array(z.array(z.union([z.string(), z.number()]))),
  }),
);

export const rawQuestionSchema = z.object({
  exp: z.string(),
  presentada: z.iso.date(),
  titulo: z.string(),
  estado: z.string(),
  autores: z.array(z.tuple([z.string(), z.string()])),
});

export const rawSessionSchema = z.object({
  id: z.string().regex(/^DSCD-\d+-(PL|CO)-\d+$/),
  fecha: z.iso.date().nullable(),
  ds: z.url({ protocol: /^https$/ }),
  intervenciones: z.array(
    z.object({
      orador: z.string(),
      grupo: z.string(),
      texto: z.string(),
      item: z.string().nullable(),
    }),
  ),
});

export const extraSchema = z.record(
  z.string(),
  z.object({
    bio: z.string(),
    comisiones: z.array(z.tuple([z.string(), z.string()])),
    turnos: z.record(z.string(), z.number()),
    intereses: z
      .record(
        z.string(),
        z.union([z.string(), z.array(z.union([z.string(), z.array(z.string())]))]),
      )
      .optional(),
  }),
);

export const quotesSchema = z.array(
  z.tuple([z.string(), z.string(), z.string(), z.string(), z.iso.date()]),
);

export const proposalsSchema = z.record(
  z.string(),
  z.record(
    z.string(),
    z.object({
      total: z.number(),
      lineas: z.array(
        z.object({
          titulo: z.string(),
          n: z.number(),
          ejemplos: z.array(z.tuple([z.string(), z.string(), z.string(), z.iso.date()])),
        }),
      ),
    }),
  ),
);

export const responsesSchema = z.object({
  ministros: z.array(
    z.object({
      orador: z.string(),
      rol: z.string(),
      n: z.number(),
      si: z.number(),
      parcial: z.number(),
      no: z.number(),
      casos: z.array(
        z.tuple([
          z.iso.date(),
          z.string(),
          z.string(),
          z.string(),
          z.string(),
          z.string(),
          z.string(),
        ]),
      ),
    }),
  ),
});

export const radarSchema = z.object({
  temas: z.record(
    z.string(),
    z.object({
      tema: z.string(),
      n: z.number(),
      primera: z.iso.date(),
      serie: z.array(z.number()),
    }),
  ),
});

export const projectionSchema = z.object({
  fecha: z.iso.date(),
  central: z.record(z.string(), z.number()),
  media: z.record(z.string(), z.number()),
  provincias: z.record(z.string(), z.record(z.string(), z.number())),
});

export const marketsSchema = z.object({
  mercados: z.array(
    z.object({
      slug: z.string(),
      pregunta: z.string(),
      url: z.url({ protocol: /^https$/ }),
      opciones: z.array(z.object({ nombre: z.string(), p: z.number() })),
    }),
  ),
});

export const accuracySchema = z.object({
  elecciones: z.array(
    z.object({
      id: z.string(),
      nombre: z.string(),
      fecha: z.iso.date(),
      media_mae: z.number(),
      resultado: z.record(z.string(), z.number()),
      media: z.record(z.string(), z.number()),
    }),
  ),
});

export const mapSchema = z.object({
  ancho: z.number(),
  alto: z.number(),
  provincias: z.record(z.string(), z.object({ n: z.string(), d: z.string() })),
});

export const historicalProvinceSchema = z.object({
  id: z.string(),
  prov: z.record(
    z.string(),
    z.object({
      e: z.number(),
      validos: z.number(),
      blancos: z.number(),
      sin_escano: z.number(),
      c: z.array(z.tuple([z.string(), z.string(), z.number(), z.number()])),
    }),
  ),
});

export const municipalitiesSchema = z.object({
  anio: z.number(),
  m: z.record(
    z.string(),
    z.tuple([
      z.string(),
      z.number(),
      z.number(),
      z.number().nullable(),
      z.number(),
      z.number().nullable(),
      z.number().nullable(),
      z.number().nullable(),
      z.number().nullable(),
      z.number().nullable(),
    ]),
  ),
});

export const balanceSchema = z.object({
  balance: z.object({
    desde: z.iso.date(),
    hasta: z.iso.date(),
    plenos: z.number(),
    votaciones: z.number(),
    sesiones: z.number(),
    intervenciones: z.number(),
    leyes: z.number(),
    leyes_organicas: z.number(),
    decretos_ley: z.number(),
    preguntas: z.number(),
    sin_respuesta: z.number(),
  }),
  caducan: z.object({
    total: z.number(),
    proyectos: z.number(),
    proposiciones: z.number(),
    lista: z.array(
      z.tuple([
        z.string(),
        z.string(),
        z.string(),
        z.string(),
        z.array(z.string()),
        z.iso.date(),
        z.number(),
        z.number(),
        z.number(),
        z.string(),
      ]),
    ),
  }),
  convalidar: z.array(
    z.object({
      numero: z.string(),
      titulo: z.string(),
      fecha: z.iso.date(),
      pdf: z.url({ protocol: /^https$/ }),
      limite_aprox: z.iso.date(),
    }),
  ),
  hay: z.object({ candidaturas: z.boolean(), resultados: z.boolean() }),
});

export const metricsSchema = z.object({
  elecciones: z.array(
    z.object({
      id: z.string(),
      fecha: z.iso.date(),
      censo: z.number(),
      votantes: z.number(),
      metricas: z.record(z.string(), z.number().nullable()),
    }),
  ),
});

export const municipalityVotesSchema = z.object({
  orden: z.array(z.string()),
  municipios: z.record(z.string(), z.array(z.number())),
});

export const municipalityNamesSchema = municipalitiesSchema;

export const ageSchema = z.object({
  fuente: z.string(),
  url: z.url({ protocol: /^https$/ }),
  edades: z.array(z.string()),
  ajustado: z.array(z.record(z.string(), z.number())),
});

datasetSchemas.set('temas.json', topicSchema);
datasetSchemas.set('diputados-extra.json', extraSchema);
datasetSchemas.set('explora-citas.json', quotesSchema);
datasetSchemas.set('explora-propuestas.json', proposalsSchema);
datasetSchemas.set('explora-contesta.json', responsesSchema);
datasetSchemas.set('explora-radar.json', radarSchema);
datasetSchemas.set('encuestas/proyeccion.json', projectionSchema);
datasetSchemas.set('encuestas/mercados.json', marketsSchema);
datasetSchemas.set('encuestas/aciertos.json', accuracySchema);
datasetSchemas.set('geografia/municipios.json', municipalitiesSchema);
datasetSchemas.set('elecciones/geo-provincias.json', mapSchema);
datasetSchemas.set('elecciones/elecciones.json', electionsSchema.and(balanceSchema));
datasetSchemas.set('elecciones/historico.json', historySchema.and(metricsSchema));
datasetSchemas.set('elecciones/municipios-202307.json', municipalityVotesSchema);
datasetSchemas.set('elecciones/voto-edad.json', ageSchema);
