import { LangfuseClient } from '@langfuse/client';
import type { Report } from './index';
export async function publishExperiment(report: Report) {
  if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY)
    throw new Error('Credenciales Langfuse ausentes');
  const client = new LangfuseClient();
  const name = report.metadata.datasetVersion + '-' + report.metadata.datasetHash.slice(0, 12);
  await client.api.datasets.create({
    name,
    description: 'Repositorio versionado; las expectativas se editan solo mediante revisión.',
    metadata: {
      version: report.metadata.datasetVersion,
      hash: report.metadata.datasetHash,
    },
  });
  for (const row of report.cases)
    await client.api.datasetItems.create({
      id: name + '-' + row.case.id,
      datasetName: name,
      input: { id: row.case.id, query: row.case.query },
      expectedOutput: row.case.expected,
      metadata: {
        ...row.case.metadata,
        review: row.case.review,
        critical: row.case.critical,
      },
    });
  const dataset = await client.dataset.get(name);
  await dataset.runExperiment({
    name: report.id,
    description:
      'Resultados del runner reproducible. El output enlaza el trace original de búsqueda.',
    metadata: report.metadata,
    task: async ({ input }) => {
      const i = input as { id: string };
      const row = report.cases.find((c) => c.case.id === i.id);
      return {
        result: row?.result,
        originalTraceId: row?.result?.traceId,
        metrics: row?.metrics,
        failures: row?.failures,
      };
    },
    evaluators: [
      async ({ output }) => {
        const o = output as { metrics?: Record<string, number | null> };
        return Object.entries(o.metrics ?? {})
          .filter((kv): kv is [string, number] => typeof kv[1] === 'number')
          .map(([name, value]) => ({ name, value }));
      },
    ],
  });
  for (const row of report.cases)
    if (row.result?.traceId)
      for (const [name, value] of Object.entries(row.metrics))
        if (value !== null)
          client.score.create({
            traceId: row.result.traceId,
            name,
            value,
            dataType: 'NUMERIC',
          });
  await client.flush();
}
