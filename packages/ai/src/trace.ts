import { startActiveObservation } from '@langfuse/tracing';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';
let sdk: NodeSDK | undefined;
export function initTracing() {
  if (!sdk && process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY) {
    sdk = new NodeSDK({ spanProcessors: [new LangfuseSpanProcessor()] });
    sdk.start();
  }
}
export async function trace<T>(name: string, input: unknown, fn: () => Promise<T>): Promise<T> {
  initTracing();
  return startActiveObservation(name, async (span) => {
    span.update({ input });
    try {
      const out = await fn();
      span.update({ output: out });
      return out;
    } catch (e) {
      span.update({
        level: 'ERROR',
        statusMessage: e instanceof Error ? e.message : 'Error',
      });
      throw e;
    }
  });
}
export async function shutdownTracing() {
  await sdk?.shutdown();
  sdk = undefined;
}
export { startActiveObservation };
