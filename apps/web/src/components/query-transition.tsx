"use client";

import { LoaderIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { createContext } from "@zenncore/utils/hooks";
import type { PropsWithChildren } from "react";
import { useMemo, useTransition } from "react";

type QueryTransition = {
  pending: boolean;
  startTransition: (callback: () => void) => void;
};

// The default is a pass-through, so consumers (search, filters, pagination)
// also work on pages that don't mount the provider.
const [QueryTransitionContext, useQueryTransitionContext] =
  createContext<QueryTransition>({
    name: "QueryTransition",
    defaultValue: {
      pending: false,
      startTransition: (callback) => callback(),
    },
  });

export const useQueryTransition = useQueryTransitionContext;

/**
 * Shares one transition between a page's query controls (search, filter
 * builder, pagination) and its table region: while a query navigation is
 * streaming its refetched rows, `pending` is true and the table can show it.
 */
export const QueryTransitionProvider = ({ children }: PropsWithChildren) => {
  const [pending, startTransition] = useTransition();

  const value = useMemo(() => ({ pending, startTransition }), [pending]);

  return (
    <QueryTransitionContext value={value}>{children}</QueryTransitionContext>
  );
};

/** Fades the content and overlays a spinner while a query refetch is pending. */
export const QueryTransitionFade = ({ children }: PropsWithChildren) => {
  const { pending } = useQueryTransition();

  return (
    <div className="relative">
      <div
        className={cn(
          "transition-opacity duration-200",
          pending && "pointer-events-none opacity-60",
        )}
      >
        {children}
      </div>
      {pending && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <LoaderIcon className="size-6 animate-spin text-foreground-dimmed" />
        </div>
      )}
    </div>
  );
};
