import { describe, it, expect } from 'vitest';
import { readPdfContext } from '../apps/web/lib/attachment';
/** A minimal PDF created inside the test, containing no real user data. */
function pdf(text: string, pages = 1) {
  const stream = `BT /F1 10 Tf 50 750 Td ${(text.match(/.{1,70}/g) ?? ['']).map((line, i) => `${i ? '0 -14 Td ' : ''}(${line}) Tj`).join(' ')} ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${Array.from({ length: pages }, (_, i) => `${5 + i} 0 R`).join(' ')}] /Count ${pages} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    ...Array.from(
      { length: pages },
      () =>
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents 4 0 R >>',
    ),
  ];
  let document = '%PDF-1.4\n';
  const offsets = [0];
  for (const [i, value] of objects.entries()) {
    offsets.push(document.length);
    document += `${i + 1} 0 obj\n${value}\nendobj\n`;
  }
  const xref = document.length;
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => `${String(n).padStart(10, '0')} 00000 n \n`)
    .join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(document);
}
describe('PDF context attachments', () => {
  it('extracts text without making it an official source', async () => {
    const result = await readPdfContext(
      'informe.pdf',
      pdf('Quiero consultar mi informe de vida laboral.'),
    );
    expect(result.text).toContain('informe de vida laboral');
    expect(result.pages).toBe(1);
    expect(result.truncated).toBe(false);
    expect(result).not.toHaveProperty('sourceId');
  });
  it('rejects non-PDF and oversized files before parsing', async () => {
    await expect(readPdfContext('fake.pdf', new TextEncoder().encode('Not a PDF'))).rejects.toThrow(
      'PDF válido',
    );
    await expect(readPdfContext('big.pdf', new Uint8Array(5 * 1024 * 1024 + 1))).rejects.toThrow(
      '5 MB',
    );
  });
  it('rejects too many pages and documents without selectable text', async () => {
    await expect(
      readPdfContext('long.pdf', pdf('Documento de prueba sin datos personales', 21)),
    ).rejects.toThrow('20 páginas');
    await expect(readPdfContext('empty.pdf', pdf(''))).rejects.toThrow('texto legible');
  });
  it('bounds the document context without silently claiming it is complete', async () => {
    const result = await readPdfContext('text.pdf', pdf('Documento de prueba. '.repeat(150), 3));
    expect(result.text.length).toBe(6000);
    expect(result.truncated).toBe(true);
  });
});
