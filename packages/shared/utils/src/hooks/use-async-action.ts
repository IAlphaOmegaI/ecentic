"use client";

import { useCallback, useState, useTransition } from "react";
import { resultify } from "../helpers/result";
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
  const [isPending, startTransition] = useTransition();
  const [pending, setPending] = useState(0);
  const run = useCallback(
    (...parameters: Parameters<F>): Promise<Awaited<ReturnType<F>>> =>
      new Promise((resolve, reject) => {
        const execute = async () => {
          setPending((current) => current + 1);
          const result = await resultify(async () => ({
            value: await action(...parameters),
          }));
          setPending((current) => current - 1);
          // Preserve the action's rejection for its caller without also
          // rejecting React's transition callback with the same failure.
          if (!result.success) {
            reject(result.error);
            return;
          }
          resolve(result.data.value);
        };

        if (withTransition) startTransition(execute);
        else void execute();
      }),
    [action, withTransition],
  );

  return [run, isPending || pending > 0];
};
