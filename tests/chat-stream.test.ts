import { describe, expect, it } from 'vitest';
import { readChatStream } from '../apps/web/lib/chat-stream';
import { collectVerifiedClaims, type AnswerSegment } from '../packages/ai/src/stream-answer';
import { understandQuery } from '../packages/retrieval/src/index';
import type { Evidence, VerifiedClaim } from '../packages/core/src/index';
const evidence: Evidence = {
  chunkId: 'c1',
  documentId: 'd1',
  sourceId: 'seg-social',
  canonicalUrl: 'https://portal.seg-social.gob.es/informe',
  title: 'Vida laboral',
  heading: 'Descarga',
  content: 'Puedes descargar el informe en PDF.',
  organization: 'Seguridad Social',
  jurisdiction: 'ES',
  authorityScore: 100,
  crawledAt: '2026-09-30T00:00:00Z',
  sourceUpdatedAt: null,
  score: 1,
  available: true,
};
const segment: AnswerSegment = {
  kind: 'step',
  text: evidence.content,
  citations: [{ documentId: 'd1', chunkId: 'c1' }],
};
async function* elements(values: AnswerSegment[]) {
  for (const value of values) yield value;
}
const query = understandQuery('¿Dónde saco mi vida laboral?');
describe('Verified incremental answers', () => {
  it('keeps supported parts when another part has insufficient evidence', async () => {
    const missing: AnswerSegment = {
      kind: 'insufficient_evidence',
      text: 'No consta el coste.',
      citations: [],
    };
    const answer = await collectVerifiedClaims(
      elements([missing, segment]),
      [evidence],
      query,
      async () => true,
    );
    expect(answer.status).toBe('answered');
    expect(answer.claims).toHaveLength(1);
    expect(answer.incomplete).toBe(true);
  });

  it('publishes a verified claim before the remaining model response arrives', async () => {
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    let first!: () => void;
    const published = new Promise<void>((resolve) => {
      first = resolve;
    });
    const seen: VerifiedClaim[] = [];
    async function* stream() {
      yield segment;
      await next;
      yield { ...segment, kind: 'fact' as const };
    }
    const result = collectVerifiedClaims(
      stream(),
      [evidence],
      query,
      async () => true,
      (block) => {
        seen.push(block);
        first();
      },
    );
    await published;
    expect(seen).toHaveLength(1);
    expect(seen[0]?.citations[0]?.quote).toBe(evidence.content);
    release();
    const answer = await result;
    expect(answer.claims).toEqual(seen.map((b) => b.claim));
    expect(answer.citations).toEqual(seen.flatMap((b) => b.citations));
  });
  it('never emits an unsupported claim and flags partial evidence', async () => {
    const seen: VerifiedClaim[] = [];
    const answer = await collectVerifiedClaims(
      elements([segment, { ...segment, text: 'La descarga cuesta 40 euros.' }]),
      [evidence],
      query,
      async (b) => b.claim.text === evidence.content,
      (b) => seen.push(b),
    );
    expect(seen).toHaveLength(1);
    expect(answer.incomplete).toBe(true);
  });
  it.each([
    { ...segment, citations: [{ documentId: 'invented', chunkId: 'c1' }] },
    { ...segment, citations: [] },
    { ...segment, text: 'Visita https://example.com' },
  ])('rejects forged or uncited blocks before semantic verification', async (value) => {
    let called = false;
    const answer = await collectVerifiedClaims(
      elements([value]),
      [evidence],
      query,
      async () => {
        called = true;
        return true;
      },
      () => {
        throw new Error('must not publish');
      },
    );
    expect(called).toBe(false);
    expect(answer.status).toBe('insufficient_evidence');
  });
  it('does not publish incompatible jurisdictions', async () => {
    const answer = await collectVerifiedClaims(
      elements([segment]),
      [{ ...evidence, jurisdiction: 'ES-CT-BARCELONA' }],
      query,
      async () => true,
      () => {
        throw new Error('must not publish');
      },
    );
    expect(answer.status).toBe('insufficient_evidence');
  });
  it('propagates a stream failure after already verified blocks', async () => {
    const seen: VerifiedClaim[] = [];
    async function* broken() {
      yield segment;
      throw new Error('connection lost');
    }
    await expect(
      collectVerifiedClaims(
        broken(),
        [evidence],
        query,
        async () => true,
        (b) => seen.push(b),
      ),
    ).rejects.toThrow('connection lost');
    expect(seen).toHaveLength(1);
  });
});
describe('Chat SSE transport', () => {
  function bytes(value: string) {
    const encoded = new TextEncoder().encode(value);
    return new ReadableStream<Uint8Array>({
      start(c) {
        for (const byte of encoded) c.enqueue(new Uint8Array([byte]));
        c.close();
      },
    });
  }
  it('handles UTF-8 characters and frames split across arbitrary network packets', async () => {
    const seen: unknown[] = [];
    await readChatStream(
      bytes(
        'event: claim\r\ndata: {"text":"¿Cómo me empadrono?"}\r\n\r\nevent: result\ndata: {"done":true}\n\n',
      ),
      (event, data) => seen.push({ event, data }),
    );
    expect(seen).toEqual([
      { event: 'claim', data: { text: '¿Cómo me empadrono?' } },
      { event: 'result', data: { done: true } },
    ]);
  });
  it('surfaces an interrupted stream rather than marking a partial answer complete', async () => {
    await expect(readChatStream(bytes('event: claim\ndata: {}\n\n'), () => {})).rejects.toThrow(
      'interrumpió',
    );
  });
  it('surfaces server errors without swallowing them', async () => {
    await expect(
      readChatStream(bytes('event: error\ndata: "No disponible"\n\n'), () => {}),
    ).rejects.toThrow('No disponible');
  });
});
