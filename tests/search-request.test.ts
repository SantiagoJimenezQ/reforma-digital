import { describe, expect, it } from 'vitest';
import { redactQuery } from '../apps/web/lib/redact';
import {
  MAX_SEARCH_BODY_BYTES,
  readSearchBody,
  searchRequestSchema,
  SearchBodyTooLargeError,
} from '../apps/web/lib/search-request';

describe('protected search request', () => {
  it('accepts expansion of valid original queries, history and PDF text', () => {
    const query = redactQuery('12345678Z '.repeat(119));
    const attachmentContext = redactQuery('12345678Z '.repeat(599));
    expect(query.length).toBeGreaterThan(1200);
    expect(attachmentContext.length).toBeGreaterThan(6000);
    expect(
      searchRequestSchema.safeParse({ query, context: Array(6).fill(query), attachmentContext })
        .success,
    ).toBe(true);
  });
  it('retains finite limits for expanded input and history', () => {
    expect(searchRequestSchema.safeParse({ query: 'a'.repeat(6001) }).success).toBe(false);
    expect(
      searchRequestSchema.safeParse({ query: 'Pregunta', attachmentContext: 'a'.repeat(30001) })
        .success,
    ).toBe(false);
    expect(
      searchRequestSchema.safeParse({ query: 'Pregunta', context: Array(7).fill('Pregunta') })
        .success,
    ).toBe(false);
  });
  it('rejects oversized UTF-8 bodies even without content-length', async () => {
    const request = new Request('https://example.test', {
      method: 'POST',
      body: 'á'.repeat(MAX_SEARCH_BODY_BYTES / 2 + 1),
    });
    expect(request.headers.has('content-length')).toBe(false);
    await expect(readSearchBody(request)).rejects.toBeInstanceOf(SearchBodyTooLargeError);
  });
  it('preserves multibyte characters split across stream chunks', async () => {
    const bytes = new TextEncoder().encode('{"query":"Qué tal"}');
    const body = new ReadableStream({
      start(controller) {
        for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
        controller.close();
      },
    });
    const request = new Request('https://example.test', {
      method: 'POST',
      body,
      duplex: 'half',
    } as RequestInit);
    expect(await readSearchBody(request)).toBe('{"query":"Qué tal"}');
  });
});
