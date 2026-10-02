export type PdfContext = {
  name: string;
  text: string;
  pages: number;
  truncated: boolean;
};
export async function readPdfContext(
  name: string,
  bytes: Uint8Array,
): Promise<PdfContext> {
  if (bytes.byteLength > 5 * 1024 * 1024)
    throw new Error("El PDF debe ocupar como máximo 5 MB.");
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
    throw new Error("Selecciona un archivo PDF válido.");
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  try {
    if (pdf.numPages > 20)
      throw new Error("El PDF debe tener como máximo 20 páginas.");
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text +=
        content.items.map((item) => ("str" in item ? item.str : "")).join(" ") +
        "\n";
      page.cleanup();
      if (text.length > 6000) break;
    }
    if (text.trim().length < 20)
      throw new Error(
        "No se encuentra texto legible. Usa un PDF con texto seleccionable; los documentos escaneados no son compatibles.",
      );
    return {
      name: name.slice(0, 150),
      text: text.slice(0, 6000),
      pages: pdf.numPages,
      truncated: text.length > 6000,
    };
  } finally {
    await pdf.loadingTask.destroy();
  }
}
