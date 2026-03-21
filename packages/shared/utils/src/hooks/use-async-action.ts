/** biome-ignore-all lint/correctness/useHookAtTopLevel: if the value of withTransition changes during render, let it error */
"use client";

import { useCallback, useState, useTransition } from "react";
import type { Prettify } from "../types";

// biome-ignore lint/suspicious/noExplicitAny: function arguments can be of any type
type AsyncAction<F extends (...args: any[]) => Promise<unknown>> = (
  ...args: Parameters<F>
) => Promise<Awaited<ReturnType<F>>>;

type UseAsyncActionReturn<F extends AsyncAction<F>> = Prettify<
  [
    handledAction: (...args: Parameters<F>) => Promise<Awaited<ReturnType<F>>>,
    isPending: boolean,
  ]
>;

export const useAsyncAction = <F extends AsyncAction<F>>(
  action: F,
  withTransition = true,
): UseAsyncActionReturn<F> => {
  if (!withTransition) {
    const [isPending, setIsPending] = useState(false);
    const handledAction = useCallback(
      async (...args: Parameters<F>): Promise<Awaited<ReturnType<F>>> => {
        setIsPending(true);
        const result = await action(...args);
        setIsPending(false);
        return result;
      },
      [action],
    );

    return [handledAction, isPending] as const;
  }

  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<F>> | null>(null);

  const handledAction = useCallback(
    async (...args: Parameters<F>): Promise<Awaited<ReturnType<F>>> => {
      startTransition(async () => {
        const result = await action(...args);
        setResult(result);
      });

      // biome-ignore lint/style/noNonNullAssertion: result is guaranteed to be set
      return result!;
    },
    [action, result],
  );

  return [
    // add as F if want to preserve the original action type
    handledAction,
    isPending,
  ] as const;
};
