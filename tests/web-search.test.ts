import { afterEach, describe, expect, it, vi } from 'vitest';
import { search } from '../packages/ai/src/index';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('chat web retrieval', () => {
  it('uses Luna high web search without embeddings or the document index', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-only-key');
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('LANGFUSE_SECRET_KEY', '');
    const content = 'Puedes solicitar el informe de vida laboral en Importass.';
    const citation = (url: string, excerpt = content) => ({
      type: 'url_citation',
      url_citation: { url, title: 'Vida laboral', content: excerpt, start_index: 0, end_index: 10 },
    });
    const fetch = vi.fn(async (_input, _init) =>
      Response.json({
        id: 'test',
        model: 'openai/gpt-6-luna',
        created: 0,
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: 'A model summary that must not become evidence.',
              annotations: [
                citation('https://portal.seg-social.gob.es/vida-laboral'),
                citation('https://portal.seg-social.gob.es/vida-laboral?utm_source=test'),
                citation('https://example.com/vida-laboral'),
                citation('https://portal.seg-social.gob.es/no-excerpt', ''),
                citation('https://sede.madrid.es/local'),
                citation('https://portal.seg-social.gob.es.evil.com/vida-laboral'),
              ],
            },
          },
        ],
        usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3, cost: 0.0001 },
      }),
    );
    vi.stubGlobal('fetch', fetch);
    const result = await search('Cómo obtener mi vida laboral', {
      mode: 'live',
      retrievalOnly: true,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]![0])).toBe('https://openrouter.ai/api/v1/chat/completions');
    const request = JSON.parse(String((fetch.mock.calls[0]![1] as RequestInit).body));
    expect(request).toMatchObject({
      model: 'openai/gpt-6-luna',
      reasoning: { effort: 'high', exclude: true },
      tools: [
        { type: 'openrouter:web_search', parameters: { engine: 'parallel', max_results: 8 } },
      ],
      max_tool_calls: 3,
    });
    expect(request.tools[0].parameters.allowed_domains).toContain('portal.seg-social.gob.es');
    expect(request.tools[0].parameters.allowed_domains).not.toContain('sede.madrid.es');
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]).toMatchObject({
      content,
      sourceId: 'seg-social',
      jurisdiction: 'ES',
    });
    expect(result.tokens).toBe(3);
    expect(result.costUsd).toBe(0.0001);
  });

  it('does not search when the user must clarify the municipality', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const result = await search('Cómo empadronarme', { mode: 'live' });
    expect(fetch).not.toHaveBeenCalled();
    expect(result.answer.status).toBe('needs_clarification');
  });
});
