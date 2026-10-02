/** Incremental UTF-8/SSE parser shared by the chat and its transport regression tests. */
export async function readChatStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: string, data: unknown) => void,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const event = frame.match(/^event: (.+)$/m)?.[1]?.trim();
        const data = frame
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (!event || !data) continue;
        const parsed: unknown = JSON.parse(data);
        if (event === "error") throw new Error(String(parsed));
        if (event === "result") completed = true;
        onEvent(event, parsed);
      }
      if (done) break;
    }
    if (!completed)
      throw new Error(
        "La conexión se interrumpió. Puedes volver a intentarlo.",
      );
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
