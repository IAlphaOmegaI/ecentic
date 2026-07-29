import { cache } from "react";

// biome-ignore lint/suspicious/noExplicitAny: matches every action shape so wrapped functions keep their signatures
type AnyAction = (...args: any[]) => unknown;

const serializeArgument = (argument: unknown): string =>
  typeof argument === "symbol"
    ? argument.toString()
    : (JSON.stringify(argument) ?? "undefined");

/**
 * Request-scoped memoization for server actions, keyed on argument *value*.
 *
 * React's `cache` compares arguments by identity, so an options object built at
 * the call site — `gatherIntelligence(Environment.SERVER, { store })` — misses
 * on every call, and each component asking for the same data re-runs the full
 * query fan-out. This wrapper keys the memo on the serialized arguments
 * instead, so all callers within one render pass share a single execution
 * (concurrent callers share the same in-flight promise).
 *
 * Outside a request scope React hands back a fresh store per call, degrading to
 * no memoization — never to a stale or cross-request result.
 */
export const dedupe = <T extends AnyAction>(action: T): T => {
  const results = cache(() => new Map<string, unknown>());

  return ((...args: Parameters<T>) => {
    const store = results();
    const key = args.map(serializeArgument).join("\u001f");

    if (!store.has(key)) store.set(key, action(...args));
    return store.get(key);
  }) as T;
};
