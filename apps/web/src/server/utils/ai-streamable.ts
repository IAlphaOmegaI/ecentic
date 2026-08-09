import { createStreamableValue } from "@ai-sdk/rsc";
import * as Sentry from "@sentry/nextjs";

/**
 * RSC-only stream helper. Kept out of `ai.ts` so CLI scripts (blog Spanish
 * Bun CLI scripts can import `generate` without resolving `@ai-sdk/rsc`'s
 * client export (which has no `createStreamableValue` — that lives on the
 * `react-server` condition Next uses).
 */
const report = (label: string, error: unknown) => {
  console.error(`[ai:${label}]`, error);
  Sentry.captureException(error, { tags: { ai: label } });
};

export const streamable = <T>(
  callback: (update: (value: T) => void) => Promise<void>,
) => {
  const value = createStreamableValue<T>();

  // @note: needed like this, otherwise the streamable value is not updated correctly, do not use resultify here
  (async () => {
    try {
      await callback((next) => {
        value.update(next);
      });
      value.done();
    } catch (error) {
      report("stream", error);
      value.error(error);
    }
  })();
  return { output: value.value };
};
