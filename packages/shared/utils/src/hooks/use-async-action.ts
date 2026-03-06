"use client";

import { useCallback, useState } from "react";
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
): UseAsyncActionReturn<F> => {
  const [isPending, setIsPending] = useState(false);

  const handledAction = useCallback(
    async (...args: Parameters<F>): Promise<Awaited<ReturnType<F>>> => {
      setIsPending(true);
      try {
        const result = await action(...args);
        setIsPending(false);
        return result;
      } catch (error) {
        setIsPending(false);
        throw error;
      }
    },
    [action],
  );

  return [
    // add as F if want to preserve the original action type
    handledAction,
    isPending,
  ] as const;
};
