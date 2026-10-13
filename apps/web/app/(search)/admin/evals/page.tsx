import { FilterSelect } from '../../../../components/congreso/common';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@reforma-digital/design/ui/collapsible';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@reforma-digital/design/ui/table';
import { Input } from '@reforma-digital/design/ui/input';
import { Button } from '@reforma-digital/design/ui/button';

import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { listReports, compareReports, type Report } from '@reforma-digital/evals/reports';
import { InfoPage } from '../../../../components/brand/info-page';
import { authorized } from '../../../../lib/security';
import { login, logout } from './actions';
export const metadata: Metadata = {
  title: 'Evaluaciones · Reforma Digital',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';
const display = (name: string, value: number | null | undefined) =>
  value == null
    ? 'N/A'
    : name.includes('Latency')
      ? Math.round(value) + ' ms'
      : name === 'costUsd'
        ? '$' + value.toFixed(5)
        : name === 'tokens'
          ? Math.round(value).toLocaleString('es-ES')
          : (value * 100).toFixed(1) + '%';
export default async function Evals({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; baseline?: string }>;
}) {
  const auth = authorized((await cookies()).get('gov_admin')?.value ?? null);
  const params = await searchParams;
  let reports: Report[] = [];
  let storageError = false;
  if (auth)
    try {
      reports = await listReports();
    } catch {
      storageError = true;
    }
  const baseline = reports.find((r) => r.id === params.baseline) ?? reports.find((r) => r.approved);
  const latest = reports[0];
  return (
    <InfoPage>
      <span
        className={
          't-etiqueta [font-family:var(--font-brand-mono)] text-xs font-medium [line-height:1.3] [letter-spacing:0.08em] uppercase info-etiqueta block mb-4 [color:var(--text-secondary)]'
        }
      >
        LABORATORIO DE CALIDAD
      </span>
      <h1>Menos intuición. Más evidencia.</h1>
      <p
        className={
          'info-entradilla [max-width:65ch] mb-10 [color:var(--text-secondary)] text-lg [line-height:1.6]'
        }
      >
        Recuperación, respuestas y regresiones. Cada métrica, cada consulta y cada configuración,
        por separado.
      </p>
      {!auth ? (
        <div
          className={
            'admin-message p-6 [background:var(--muted)] [border-radius:20px] my-6 [&_h2]:[font-size:28px] [&_p]:mt-4 [&_p]:[color:var(--text-secondary)] [&_form]:grid [&_form]:gap-4 [&_form]:[max-width:360px] [&_form]:mt-6'
          }
        >
          <h2>Acceso interno</h2>
          <p>
            {process.env.ADMIN_TOKEN
              ? 'Introduce la clave del operador para consultar experimentos y sus fallos.'
              : 'Configura ADMIN_TOKEN en el servidor para habilitar el acceso. Los informes de consultas no son públicos.'}
          </p>
          {process.env.ADMIN_TOKEN && (
            <form action={login}>
              <label htmlFor="token">Clave de administrador</label>
              <Input
                id="token"
                name="token"
                type="password"
                autoComplete="current-password"
                required
              />
              {params.error && <p role="alert">Clave incorrecta.</p>}
              <Button type="submit" variant="default">
                Entrar
              </Button>
            </form>
          )}
        </div>
      ) : (
        <>
          <form action={logout}>
            <Button variant="ghost">Cerrar sesión</Button>
          </form>
          {storageError && (
            <p role="alert">No se ha podido acceder al almacenamiento de experimentos.</p>
          )}
          {!latest ? (
            <div
              className={
                'admin-message p-6 [background:var(--muted)] [border-radius:20px] my-6 [&_h2]:[font-size:28px] [&_p]:mt-4 [&_p]:[color:var(--text-secondary)] [&_form]:grid [&_form]:gap-4 [&_form]:[max-width:360px] [&_form]:mt-6'
              }
            >
              <h2>Todavía no hay experimentos</h2>
              <p>
                Ejecuta <code>pnpm eval</code> desde el repositorio. No se muestran métricas
                simuladas.
              </p>
            </div>
          ) : (
            <>
              <div>
                <span
                  className={
                    'status-badge inline-block [margin:8px_8px_0_0] [padding:8px_12px] [border-radius:12px] [background:var(--warning)] [color:var(--warning-foreground)] text-sm'
                  }
                >
                  {latest.metadata.mode === 'preview'
                    ? 'Vista previa · no certifica producción'
                    : 'Índice conectado'}
                </span>
                <span
                  className={
                    'status-badge inline-block [margin:8px_8px_0_0] [padding:8px_12px] [border-radius:12px] [background:var(--warning)] [color:var(--warning-foreground)] text-sm'
                  }
                >
                  {latest.metadata.reviewedCases}/{latest.metadata.totalCases} casos revisados
                </span>
                <span
                  className={
                    'status-badge inline-block [margin:8px_8px_0_0] [padding:8px_12px] [border-radius:12px] [background:var(--warning)] [color:var(--warning-foreground)] text-sm'
                  }
                >
                  {baseline?.approved
                    ? 'Baseline aprobado'
                    : baseline
                      ? 'Comparación provisional · sin aprobar'
                      : 'Baseline de producción pendiente'}
                </span>
              </div>
              <div
                className={
                  'metric-grid grid [grid-template-columns:repeat(4,_minmax(0,_1fr))] gap-4 my-6 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]'
                }
              >
                {[
                  'recall5',
                  'faithfulness',
                  'citationPrecision',
                  'wrongJurisdiction',
                  'completeness',
                  'abstentionAccuracy',
                  'p95Latency',
                  'costUsd',
                ].map((k) => (
                  <div
                    className={
                      'metric-tile p-5 [border:1px_solid_var(--border)] [border-radius:20px] [&_span]:text-sm [&_span]:[color:var(--text-secondary)] [&_strong]:block [&_strong]:mt-3 [&_strong]:[font:400_26px/1.2_var(--font-brand-mono)]'
                    }
                    key={k}
                  >
                    <span>{k}</span>
                    <strong>{display(k, latest.metrics[k])}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
          {reports.length > 1 && (
            <form method="get">
              <label htmlFor="baseline-run">Comparar con experimento </label>
              <FilterSelect
                name="baseline"
                label="Comparar con experimento"
                defaultValue={baseline?.id ?? ''}
                options={[
                  { value: '', label: 'Baseline aprobado' },
                  ...reports.map((r) => ({
                    value: r.id,
                    label: `${r.metadata.datasetVersion} · ${r.cases.length} casos · ${r.id.slice(0, 8)}${r.approved ? ' · aprobado' : ''}`,
                  })),
                ]}
              />
              <Button type="submit" variant="ghost">
                Comparar
              </Button>
            </form>
          )}
          {reports.map((r) => {
            let comparison: ReturnType<typeof compareReports> | null = null;
            let comparisonError = '';
            if (baseline && baseline.id !== r.id)
              try {
                comparison = compareReports(r, baseline);
              } catch (e) {
                comparisonError = e instanceof Error ? e.message : 'No comparable';
              }
            return (
              <Collapsible
                className={
                  'report-panel p-6 [background:var(--muted)] [border-radius:20px] my-6 [&_h2]:[font-size:28px] [&_p]:mt-4 [&_p]:[color:var(--text-secondary)] [&_summary]:min-h-11 [&_summary]:cursor-pointer [&_pre]:[max-height:400px] [&_pre]:overflow-auto [&_pre]:p-4 [&_pre]:[background:var(--background)] [&_pre]:[border-radius:12px] [&_pre]:[font:14px/1.6_var(--font-brand-mono)]'
                }
                key={r.id}
                defaultOpen={r.id === latest?.id}
              >
                <CollapsibleTrigger>
                  {new Date(r.metadata.timestamp).toLocaleString('es-ES')} ·{' '}
                  {r.metadata.datasetVersion} · {r.cases.length} casos
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p>
                    {r.id} · {r.metadata.model} · {r.metadata.mode} · Git {r.metadata.gitCommit}
                    {r.metadata.dirty ? ' (cambios locales)' : ''}
                  </p>
                  {comparisonError && <p>{comparisonError}</p>}
                  {comparison && (
                    <>
                      <h3>Comparación con baseline</h3>
                      <pre>{JSON.stringify(comparison, null, 2)}</pre>
                    </>
                  )}
                  <div className={'table-scroll overflow-auto'}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Métrica</TableHead>
                          <TableHead>Global</TableHead>
                          {Object.keys(r.categories).map((c) => (
                            <TableHead key={c}>{c}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(r.metrics).map(([k, v]) => (
                          <TableRow key={k}>
                            <TableCell>{k}</TableCell>
                            <TableCell>{display(k, v)}</TableCell>
                            {Object.values(r.categories).map((m, i) => (
                              <TableCell key={i}>{display(k, m[k])}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Collapsible>
                    <CollapsibleTrigger>Modelo y configuración reproducible</CollapsibleTrigger>
                    <CollapsibleContent>
                      <pre>{JSON.stringify(r.metadata, null, 2)}</pre>
                    </CollapsibleContent>
                  </Collapsible>
                  <h2>Fallos ({r.cases.filter((c) => c.failures.length).length})</h2>
                  {r.cases
                    .filter((c) => c.failures.length)
                    .map((c) => (
                      <div
                        className={
                          'failure py-5 [border-top:1px_solid_var(--border)] [overflow-wrap:anywhere] [&_h3]:my-3 [&_h3]:text-lg [&_a]:inline-flex [&_a]:items-center [&_a]:min-h-11 [&_a]:[color:var(--link)] [&_a]:[text-decoration:underline]'
                        }
                        key={c.case.id}
                      >
                        <span
                          className={
                            'status-badge inline-block [margin:8px_8px_0_0] [padding:8px_12px] [border-radius:12px] [background:var(--warning)] [color:var(--warning-foreground)] text-sm'
                          }
                        >
                          {c.case.id}
                          {c.case.critical ? ' · CRÍTICO' : ''}
                        </span>
                        <h3>{c.case.query}</h3>
                        <p>
                          <strong>Fallo:</strong> {c.failures.join(' · ')} {c.error}
                        </p>
                        <p>
                          <strong>Esperado:</strong> {c.case.expected.relevantSourceIds.join(', ')}{' '}
                          · {c.case.expected.mustContainFacts.join('; ')}
                        </p>
                        <ol>
                          {c.result?.evidence.slice(0, 5).map((e) => (
                            <li key={e.chunkId}>
                              <a href={e.canonicalUrl} target="_blank" rel="noopener noreferrer">
                                {e.title}
                              </a>{' '}
                              · {e.jurisdiction}
                            </li>
                          ))}
                        </ol>
                        <Collapsible>
                          <CollapsibleTrigger>Respuesta y jueces</CollapsibleTrigger>
                          <CollapsibleContent>
                            <pre>
                              {JSON.stringify(
                                { answer: c.result?.answer, judges: c.judges },
                                null,
                                2,
                              )}
                            </pre>
                          </CollapsibleContent>
                        </Collapsible>
                        <code>Trace ID: {c.result?.traceId ?? 'N/A'}</code>
                      </div>
                    ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </>
      )}
    </InfoPage>
  );
}
