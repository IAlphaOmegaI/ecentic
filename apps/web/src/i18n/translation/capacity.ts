import { setTimeout } from "node:timers/promises";
import type { TranslationGeneration } from "./runner";

/** Request JSON follows the instruction paragraph; contexts inside it are escaped. */
export const translationOutputBudget = (request: TranslationGeneration) => {
  const payload = (() => {
    try {
      return JSON.parse(
        request.prompt.slice(request.prompt.lastIndexOf("\n") + 1),
      ) as {
        units?: { id: string; text: string }[];
        requestedIds?: string[];
        findings?: unknown[];
      };
    } catch {
      return null;
    }
  })();
  if (!payload) return 18_000;
  const units = (payload.units ?? []).filter(
    (unit) => !payload.requestedIds || payload.requestedIds.includes(unit.id),
  );
  const identifiers = units.reduce((sum, unit) => sum + unit.id.length, 0);
  const text = units.reduce((sum, unit) => sum + unit.text.length, 0);
  const estimated = (() => {
    switch (request.phase) {
      case "adjudicate":
        return 1000 + (payload.findings?.length ?? 0) * 400;
      case "review":
        return 1500 + identifiers / 2.5 + units.length * 24;
      default:
        return 1500 + identifiers / 2.5 + text * 0.55;
    }
  })();
  return Math.min(24_000, Math.max(2000, Math.ceil(estimated)));
};

/** Retry an output-limit failure once; partial output never leaves this boundary. */
export const withTranslationOutputBudget = async <Value>(
  request: TranslationGeneration,
  run: (maxOutputTokens: number) => Promise<Value>,
  isTruncated: (error: unknown) => boolean,
): Promise<Value> => {
  const budget = translationOutputBudget(request);
  try {
    return await run(budget);
  } catch (error) {
    if (!isTruncated(error) || budget >= 24_000) throw error;
    return run(Math.min(24_000, budget * 2));
  }
};

/** One process shares reservations across workers; Azure 429s remain authoritative. */
export const createTranslationCapacity = ({
  tokensPerMinute,
  now = Date.now,
  wait = (milliseconds: number, signal: AbortSignal) =>
    setTimeout(milliseconds, undefined, { signal }),
}: {
  tokensPerMinute: number;
  now?: () => number;
  wait?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
}) => {
  if (!Number.isSafeInteger(tokensPerMinute) || tokensPerMinute <= 0)
    throw new Error("Translation capacity must be a positive token budget.");
  const state = {
    reservations: [] as { at: number; tokens: number }[],
    queue: Promise.resolve(),
  };
  return (estimatedTokens: number, signal: AbortSignal) => {
    const reserved = Math.min(tokensPerMinute, Math.ceil(estimatedTokens));
    const acquisition = state.queue.then(async () => {
      while (true) {
        signal.throwIfAborted();
        const currentTime = now();
        state.reservations = state.reservations.filter(
          (entry) => currentTime - entry.at < 60_000,
        );
        const used = state.reservations.reduce(
          (sum, entry) => sum + entry.tokens,
          0,
        );
        if (used + reserved <= tokensPerMinute) {
          state.reservations.push({ at: currentTime, tokens: reserved });
          return;
        }
        const earliest = state.reservations[0];
        await wait(
          Math.max(1, (earliest?.at ?? currentTime) + 60_000 - currentTime),
          signal,
        );
      }
    });
    state.queue = acquisition.catch(() => undefined);
    return acquisition;
  };
};
