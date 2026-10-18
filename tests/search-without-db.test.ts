import { describe, expect, it } from 'vitest';
import { previewCorpus } from '../packages/ai/src/preview-corpus';

describe('search without a hosted database', () => {
  it('keeps official corpus excerpts available without Postgres', () => {
    expect(previewCorpus.some((item) => /vida laboral/i.test(item.content))).toBe(true);
  });
});
