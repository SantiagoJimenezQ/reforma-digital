import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Badge } from '@reforma-digital/design/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@reforma-digital/design/ui/table';
import { Header } from '../../../components/brand/header';
import { Footer } from '../../../components/brand/footer';
import { CodeBlock } from '../../../components/code-block';
import { JsonLd } from '../../../components/json-ld';
import { breadcrumbs, pageMetadata, webPage } from '../../../lib/seo';
import { siteUrl } from '../../../lib/site';

const title = 'API abierta del Congreso · Reforma Digital';
const description =
  'Votaciones, preguntas, Diarios de Sesiones y conjuntos de datos del Congreso en JSON. Sin claves, con CORS abierto y licencia CC BY 4.0 para que los uses en tus proyectos.';

export const metadata: Metadata = pageMetadata({ title, description, path: '/api', og: 'fuentes' });

const graph = [webPage({ name: title, description, path: '/api' }), breadcrumbs('API', '/api')];

const base = new URL('/api/congreso', siteUrl).href;

type Param = [name: string, text: string, value?: string];
const listParams: Param[] = [
  ['pagina', 'Página de resultados, desde 1.', '1'],
  ['limite', 'Resultados por página, de 1 a 100.', '24'],
  ['legislatura', 'Número romano de la legislatura.', 'XV'],
  ['desde', 'Fecha mínima, AAAA-MM-DD.'],
  ['hasta', 'Fecha máxima, AAAA-MM-DD.'],
];
const legislature: Param[] = [['legislatura', 'Número romano de la legislatura.', 'XV']];

// Forma de cada respuesta según las consultas de app/api/congreso; los valores son ilustrativos.
const endpoints: {
  id: string;
  path: string;
  title: string;
  text: ReactNode;
  params?: Param[];
  example: string;
  response?: string;
}[] = [
  {
    id: 'indice',
    path: '',
    title: 'Índice',
    text: 'La última publicación, los conjuntos disponibles con su hash y la atribución que debes citar.',
    example: '',
    response: `{
  "version": 1,
  "atribucion": { "origen": "Escaño Abierto", "licencia": "CC BY 4.0", … },
  "publicacion": { "id": "…", "created_at": "…", "counts": { … } },
  "conjuntos": [{ "path": "leyes.json", "sha256": "…", "updated_at": "…" }],
  "endpoints": ["datasets/<ruta.json>", "votaciones", …]
}`,
  },
  {
    id: 'votaciones',
    path: '/votaciones',
    title: 'Votaciones',
    text: 'Votaciones del Pleno, de la más reciente a la más antigua, con el recuento de cada sentido.',
    params: [...listParams, ['q', 'Busca en el título, hasta 200 caracteres.']],
    example: '/votaciones?q=vivienda&limite=5',
    response: `{
  "pagina": 1, "limite": 5, "total": 42,
  "resultados": [{
    "id": "…", "legislature": "XV", "date": "2025-03-12",
    "title": "…", "kind": "…", "initiative": "…",
    "yes_count": 172, "no_count": 170, "abstention_count": 1,
    "absent_count": 7, "topics": […]
  }]
}`,
  },
  {
    id: 'votacion',
    path: '/votaciones/<id>',
    title: 'Una votación',
    text: (
      <>
        La votación y el voto de cada diputado: <code>S</code> sí, <code>N</code> no, <code>A</code>{' '}
        abstención y <code>X</code> no vota.
      </>
    ),
    params: legislature,
    example: '/votaciones/<id>',
    response: `{
  "votacion": { "id": "…", "title": "…", "yes_count": 172, … },
  "votos": [{ "diputado": "…", "grupo": "…", "voto": "S" }]
}`,
  },
  {
    id: 'preguntas',
    path: '/preguntas',
    title: 'Preguntas',
    text: 'Preguntas parlamentarias con su expediente, autores y estado de tramitación.',
    params: [
      ...listParams,
      ['q', 'Busca en el título, hasta 200 caracteres.'],
      ['estado', 'Estado exacto de la pregunta.'],
    ],
    example: '/preguntas?q=sanidad',
    response: `{
  "pagina": 1, "limite": 24, "total": 318,
  "resultados": [{
    "exp": "…", "presentada": "2025-02-03", "titulo": "…",
    "estado": "…", "autores": [["…", "…"]]
  }]
}`,
  },
  {
    id: 'sesiones',
    path: '/sesiones',
    title: 'Sesiones',
    text: 'Diarios de Sesiones del Pleno y las comisiones, con el número de intervenciones.',
    params: [...listParams, ['q', 'Busca en el nombre del órgano.']],
    example: '/sesiones?q=pleno&desde=2025-01-01',
    response: `{
  "pagina": 1, "limite": 24, "total": 96,
  "resultados": [{
    "id": "DSCD-15-PL-1", "date": "2023-08-17",
    "organo": "Pleno", "intervenciones": 84
  }]
}`,
  },
  {
    id: 'sesion',
    path: '/sesiones/<id>',
    title: 'Una sesión',
    text: (
      <>
        Una sesión completa con todas sus intervenciones. El identificador tiene la forma{' '}
        <code>DSCD-15-PL-1</code> (PL para el Pleno, CO para comisiones).
      </>
    ),
    params: legislature,
    example: '/sesiones/DSCD-15-PL-1',
    response: `{
  "id": "DSCD-15-PL-1", "fecha": "2023-08-17", "ds": "https://…",
  "intervenciones": [{ "orador": "…", "grupo": "…", "texto": "…", "item": "…" }]
}`,
  },
  {
    id: 'datasets',
    path: '/datasets/<ruta.json>',
    title: 'Conjuntos de datos',
    text: (
      <>
        Los archivos originales que alimentan la web: <code>leyes.json</code>,{' '}
        <code>temas.json</code>, <code>elecciones/historico.json</code> y el resto de rutas del
        índice. Devuelven <code>ETag</code>.
      </>
    ),
    example: '/datasets/leyes.json',
  },
  {
    id: 'descarga',
    path: '/descarga',
    title: 'Descarga completa',
    text: 'El histórico entero en un archivo .tar.gz. Úsalo si necesitas todos los datos en lugar de recorrer la API.',
    example: '/descarga',
  },
];

const errors = [
  ['400', 'Un filtro, ruta o identificador no tiene un formato válido.'],
  ['404', 'El endpoint o el recurso no existe.'],
  ['451', 'Encuestas y descarga completa, ocultas durante el periodo legal de veda.'],
  ['503', 'Los datos no están disponibles temporalmente.'],
];

const nav = [
  [
    'Empezar',
    [
      ['introduccion', 'Introducción'],
      ['primeros-pasos', 'Primeros pasos'],
    ],
  ],
  ['Endpoints', endpoints.map(({ id, title }) => [id, title])],
  [
    'Referencia',
    [
      ['errores', 'Errores'],
      ['cache', 'Caché'],
      ['licencia', 'Licencia y atribución'],
    ],
  ],
] as const;

const mono = 'font-mono text-[0.9em]';

function Params({ params }: { params: Param[] }) {
  return (
    <Table className="my-4">
      <TableHeader>
        <TableRow>
          <TableHead>Parámetro</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead>Por defecto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {params.map(([name, text, value]) => (
          <TableRow key={name}>
            <TableCell>
              <code className={mono}>{name}</code>
            </TableCell>
            <TableCell className="whitespace-normal">{text}</TableCell>
            <TableCell>{value ? <code className={mono}>{value}</code> : '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Doc({ id, title, children }: { id: string; title: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-12">
      <h2 className="mb-4 font-heading text-3xl leading-tight">{title}</h2>
      {children}
    </section>
  );
}

export default function Api() {
  return (
    <>
      <JsonLd graph={graph} />
      <Header current="/api" />
      <div className="mx-auto max-w-(--container-content) px-(--page-gutter) min-[1100px]:grid min-[1100px]:grid-cols-[232px_minmax(0,1fr)] min-[1100px]:gap-x-12">
        <nav
          aria-label="Documentación de la API"
          className="sticky top-6 hidden self-start py-16 min-[1100px]:block"
        >
          {nav.map(([group, links]) => (
            <div key={group} className="mb-6">
              <p className="mb-2 px-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {group}
              </p>
              <ul className="grid gap-0.5">
                {links.map(([id, text]) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="block rounded-lg px-3 py-1.5 text-sm no-underline hover:bg-muted"
                    >
                      {text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <main id="main" tabIndex={-1} className="min-w-0 max-w-[820px] pt-16 pb-20">
          <section id="introduccion" className="scroll-mt-24 pb-12">
            <Badge variant="outline" className="mb-6 font-mono uppercase tracking-wider">
              API pública · v1
            </Badge>
            <h1 className="mb-6 font-heading text-[clamp(36px,4.5vw,60px)] leading-[1.1] tracking-tight">
              Los datos del Congreso, para tus proyectos.
            </h1>
            <p className="mb-8 max-w-[65ch] text-lg leading-relaxed text-muted-foreground">
              Votaciones, preguntas, Diarios de Sesiones y los conjuntos originales que usa la web,
              en JSON. Sin claves ni registro: llama a la API desde tu servidor o directamente desde
              el navegador.
            </p>
            <ul className="mb-8 flex flex-wrap gap-2">
              {['Sin autenticación', 'CORS abierto', 'JSON', 'CC BY 4.0'].map((text) => (
                <li key={text}>
                  <Badge variant="secondary">{text}</Badge>
                </li>
              ))}
            </ul>
            <CodeBlock label="URL base" code={base} />
          </section>

          <Doc id="primeros-pasos" title="Primeros pasos">
            <p className="text-muted-foreground">
              Todas las peticiones son <code className={mono}>GET</code>. Empieza por el índice para
              ver qué hay publicado y luego pide los listados que necesites.
            </p>
            <CodeBlock label="curl" code={`curl "${base}/votaciones?q=vivienda&limite=5"`} />
            <CodeBlock
              label="JavaScript"
              code={`const res = await fetch('${base}/votaciones?q=vivienda&limite=5');
const { total, resultados } = await res.json();`}
            />
            <p className="text-muted-foreground">
              Los listados devuelven{' '}
              <code className={mono}>{'{ pagina, limite, total, resultados }'}</code>. Para
              recorrerlos, aumenta <code className={mono}>pagina</code> hasta que hayas leído{' '}
              <code className={mono}>total</code> resultados.
            </p>
          </Doc>

          {endpoints.map((endpoint) => (
            <Doc key={endpoint.id} id={endpoint.id} title={endpoint.title}>
              <p className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-muted px-4 py-3">
                <Badge className="font-mono">GET</Badge>
                <code className="font-mono text-sm break-all">/api/congreso{endpoint.path}</code>
              </p>
              <p className="text-muted-foreground">{endpoint.text}</p>
              {endpoint.params && <Params params={endpoint.params} />}
              <CodeBlock label="Petición" code={`curl "${base}${endpoint.example}"`} />
              {endpoint.response && <CodeBlock label="Respuesta" code={endpoint.response} />}
            </Doc>
          ))}

          <Doc id="errores" title="Errores">
            <p className="text-muted-foreground">
              Los errores responden con su código HTTP y un cuerpo{' '}
              <code className={mono}>{'{ "error": "…" }'}</code> que explica el motivo.
            </p>
            <Table className="my-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cuándo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.map(([code, text]) => (
                  <TableRow key={code}>
                    <TableCell>
                      <code className={mono}>{code}</code>
                    </TableCell>
                    <TableCell className="whitespace-normal">{text}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Doc>

          <Doc id="cache" title="Caché">
            <p className="text-muted-foreground">
              Los conjuntos incluyen <code className={mono}>ETag</code>. Envíalo en{' '}
              <code className={mono}>If-None-Match</code> y recibirás un{' '}
              <code className={mono}>304</code> sin cuerpo si no ha cambiado. Guarda las respuestas
              en caché y usa la descarga completa si vas a leerlo todo.
            </p>
            <CodeBlock
              label="curl"
              code={`curl -H 'If-None-Match: "<sha256>"' "${base}/datasets/leyes.json"`}
            />
          </Doc>

          <Doc id="licencia" title="Licencia y atribución">
            <p className="text-muted-foreground">
              Los datos se publican con licencia{' '}
              <strong className="text-foreground">CC BY 4.0</strong> y las encuestas con{' '}
              <strong className="text-foreground">CC BY-SA 4.0</strong>. Cita la fuente que indica
              el campo <code className={mono}>atribucion</code> del índice. Los resúmenes y temas se
              generan con IA y pueden contener errores: los documentos oficiales del Congreso son la
              referencia.
            </p>
          </Doc>
        </main>
      </div>
      <Footer />
    </>
  );
}
