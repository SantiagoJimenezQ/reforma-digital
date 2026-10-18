import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultConfig } from '../packages/core/src/index';
import { generateElements, structured } from '../packages/ai/src/models';
import { segmentSchema } from '../packages/ai/src/stream-answer';
import { recordUsage, usageContext, usageSummary } from '../packages/ai/src/usage';
type JsonSchema = {
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
};
/** Object schemas whose keys are not all required, which OpenAI strict mode rejects. */
function looseObjects(schema: JsonSchema, path = '$'): string[] {
  const own =
    schema.properties &&
    Object.keys(schema.properties).some((key) => !schema.required?.includes(key))
      ? [path]
      : [];
  return [
    ...own,
    ...Object.entries(schema.properties ?? {}).flatMap(([key, child]) =>
      looseObjects(child, `${path}.${key}`),
    ),
    ...(schema.items ? looseObjects(schema.items, `${path}[]`) : []),
  ];
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const segment = { kind: 'step', text: 'Pide cita.', figure: null, citations: [] };
describe('NaN Builders transport', () => {
  it('sends the default model with high reasoning and a strict JSON schema to NaN', async () => {
    vi.stubEnv('NAN_API_KEY', 'test-only-key');
    let request: Record<string, unknown> = {};
    let url = '';
    let auth = '';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input, init) => {
        url = String(input);
        auth = new Headers(init.headers).get('authorization') ?? '';
        request = JSON.parse(init.body);
        return Response.json({
          id: 'test',
          model: defaultConfig.generationModel,
          created: 0,
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: JSON.stringify(segment) },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 },
        });
      }),
    );
    const r = await structured(segmentSchema, 'test', {}, defaultConfig.generationModel);
    expect(r.object).toEqual(segment);
    expect(url).toBe('https://api.nan.builders/v1/chat/completions');
    expect(auth).toBe('Bearer test-only-key');
    expect(request.model).toBe('deepseek-v4-flash');
    expect(request.reasoning_effort).toBe('high');
    expect(request.response_format).toMatchObject({ type: 'json_schema' });
  });
  it('asks for answer blocks without streaming and with a schema strict outputs accept', async () => {
    vi.stubEnv('NAN_API_KEY', 'test-only-key');
    let request: {
      stream?: boolean;
      response_format?: { json_schema?: { schema?: JsonSchema } };
    } = {};
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input, init) => {
        request = JSON.parse(init.body);
        return Response.json({ error: { message: 'stop', code: 400 } }, { status: 400 });
      }),
    );
    await generateElements(
      segmentSchema,
      'test',
      {},
      defaultConfig.generationModel,
      async (items) => {
        for await (const _ of items);
      },
    ).catch(() => {});
    // NaN rejects a JSON schema on streamed requests.
    expect(request.stream).toBeFalsy();
    const schema = request.response_format?.json_schema?.schema;
    expect(schema).toBeDefined();
    expect(looseObjects(schema!)).toEqual([]);
  });
});
describe('usage accounting', () => {
  it('adds known costs and never turns an unknown cost into zero', () => {
    usageContext.run([], () => {
      recordUsage('exa', 0, 0, 0.003, performance.now());
      recordUsage('deepseek-v4-flash', 100, 50, 0.001, performance.now());
      expect(usageSummary()).toMatchObject({ tokens: 150, costUsd: 0.004 });
      recordUsage('deepseek-v4-flash', 2, 1, null, performance.now());
      expect(usageSummary().costUsd).toBeNull();
    });
  });
});
