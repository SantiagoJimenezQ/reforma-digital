import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultConfig } from '../packages/core/src/index';
import { languageModel, streamElements } from '../packages/ai/src/models';
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
describe('OpenRouter transport', () => {
  it('sends GPT-6 Luna with high reasoning to OpenRouter', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-only-key');
    let request: Record<string, unknown> = {};
    let url = '';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input, init) => {
        url = String(input);
        request = JSON.parse(init.body);
        return Response.json({
          id: 'test',
          model: defaultConfig.generationModel,
          created: 0,
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'ok' },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 2,
            completion_tokens: 1,
            total_tokens: 3,
            cost: 0.0001,
          },
        });
      }),
    );
    await languageModel(defaultConfig.generationModel).doGenerate({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
      maxOutputTokens: 20,
    });
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(request.model).toBe('openai/gpt-6-luna');
    expect(request.reasoning).toEqual({ effort: 'high', exclude: true });
    expect(request.provider).toEqual({ require_parameters: true });
  });
  it('sends an answer block schema that OpenAI strict structured outputs accept', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-only-key');
    let request: { response_format?: { json_schema?: { schema?: JsonSchema } } } = {};
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input, init) => {
        request = JSON.parse(init.body);
        return Response.json({ error: { message: 'stop', code: 400 } }, { status: 400 });
      }),
    );
    await streamElements(
      segmentSchema,
      'test',
      {},
      defaultConfig.generationModel,
      async (items) => {
        for await (const _ of items);
      },
    ).catch(() => {});
    const schema = request.response_format?.json_schema?.schema;
    expect(schema).toBeDefined();
    expect(looseObjects(schema!)).toEqual([]);
  });
});
describe('OpenRouter accounting', () => {
  it('records the real OpenRouter cost and never turns unknown cost into zero', () => {
    usageContext.run([], () => {
      recordUsage(
        'openai/gpt-6-luna',
        100,
        50,
        { openrouter: { usage: { cost: 0.003 } } },
        performance.now(),
      );
      expect(usageSummary()).toMatchObject({ tokens: 150, costUsd: 0.003 });
      recordUsage('openai/gpt-6-luna', 2, 1, {}, performance.now());
      expect(usageSummary().costUsd).toBeNull();
    });
  });
});
