import { describe, expect, it } from 'vitest';
import { ChatGuard } from '../apps/web/node_modules/@nationaldesignstudio/rampart';
import { protectionDetails } from '../apps/web/lib/pii-display';
import { redactQuery } from '../apps/web/lib/redact';

describe('redaction feedback', () => {
  it('maps real Rampart placeholders and Spanish rules back to the original text', async () => {
    const original = 'Mi DNI es 12345678Z. Me llamo Ana García. Correo ana@example.com.';
    const guard = new ChatGuard({
      ner: async (text) =>
        ['Ana', 'García'].map((name, index) => ({
          start: text.indexOf(name),
          end: text.indexOf(name) + name.length,
          label: index ? ('SURNAME' as const) : ('GIVEN_NAME' as const),
          score: 1,
          source: 'ner' as const,
          text: name,
        })),
    });
    const result = await guard.protect(redactQuery(original));
    const details = protectionDetails(original, result.text, result.placeholders, (token) =>
      guard.reveal(token),
    );
    expect(details.ranges.map(({ start, end }) => original.slice(start, end))).toEqual([
      '12345678Z',
      'Ana',
      'García',
      'ana@example.com',
    ]);
    expect(details.text).toBe(result.text);
    expect(details.text).not.toContain('12345678Z');
    expect(details.text).not.toContain('Ana');
  });

  it('does not mark literal placeholders typed by the user', () => {
    const text = 'Ejemplo [GIVEN_NAME_1] y [DNI omitido]';
    expect(protectionDetails(text, text, [], (token) => token).ranges).toEqual([]);
  });

  it('distinguishes an existing marker from a real replacement using the same token', () => {
    const original = 'Ejemplo [GIVEN_NAME_1] y Ana';
    const result = protectionDetails(
      original,
      'Ejemplo [GIVEN_NAME_1] y [GIVEN_NAME_1]',
      ['[GIVEN_NAME_1]'],
      () => 'Ana',
    );
    expect(result.ranges.map(({ start, end }) => original.slice(start, end))).toEqual(['Ana']);
  });

  it('handles repeated entities with different case and spacing in a session', () => {
    const original = 'ana   maría y ANA MARÍA';
    const result = protectionDetails(
      original,
      '[GIVEN_NAME_1] y [GIVEN_NAME_1]',
      ['[GIVEN_NAME_1]', '[GIVEN_NAME_1]'],
      () => 'Ana María',
    );
    expect(result.ranges.map(({ start, end }) => original.slice(start, end))).toEqual([
      'ana   maría',
      'ANA MARÍA',
    ]);
  });

  it('leaves uncertain offsets unmarked rather than claiming the wrong data was hidden', () => {
    expect(
      protectionDetails('Soy Ana', '[GIVEN_NAME_1]', ['[GIVEN_NAME_1]'], () => 'Ana').ranges,
    ).toEqual([]);
  });

  it('preserves offsets around emoji and redacted bank accounts', () => {
    const original = '🙂 ES12 1234 1234 1234 1234 1234 y 612345678';
    const result = protectionDetails(original, redactQuery(original), [], (token) => token);
    expect(result.ranges.map(({ start, end }) => original.slice(start, end))).toEqual([
      'ES12 1234 1234 1234 1234 1234',
      '612345678',
    ]);
  });
});
