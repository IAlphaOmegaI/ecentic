"use client";

import { LoaderIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { createContext } from "@zenncore/utils/hooks";
import type { PropsWithChildren, ReactNode, RefObject } from "react";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useTransition,
} from "react";

type QueryTransition = {
  pending: boolean;
  startTransition: (callback: () => void) => void;
  focusOrigin: RefObject<HTMLElement | null> | null;
};

// The default is a pass-through, so consumers (search, filters, pagination)
// also work on pages that don't mount the provider.
const [QueryTransitionContext, useQueryTransitionContext] =
  createContext<QueryTransition>({
    name: "QueryTransition",
    defaultValue: {
      pending: false,
      startTransition: (callback) => callback(),
      focusOrigin: null,
    },
  });

export const useQueryTransition = useQueryTransitionContext;

/**
 * Shares one transition between a page's query controls (search, filter
 * builder, pagination) and its table region: while a query navigation is
 * streaming its refetched rows, `pending` is true and the table can show it.
 */
export const QueryTransitionProvider = ({ children }: PropsWithChildren) => {
  const [pending, beginTransition] = useTransition();
  const focusOrigin = useRef<HTMLElement | null>(null);
  const startTransition = useCallback((callback: () => void) => {
    focusOrigin.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    beginTransition(callback);
  }, []);

  const value = useMemo(
    () => ({ pending, startTransition, focusOrigin }),
    [pending, startTransition],
  );

  return (
    <QueryTransitionContext value={value}>{children}</QueryTransitionContext>
  );
};

/** Retains content during refetch; callers may supply a contextual indicator. */
export const QueryTransitionFade = ({
  children,
  indicator,
  blur = false,
}: PropsWithChildren<{ indicator?: ReactNode; blur?: boolean }>) => {
  const { pending, focusOrigin } = useQueryTransition();
  const content = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const region = content.current;
    if (!region) return;

    if (pending) {
      const origin = focusOrigin?.current;
      restoreFocus.current = origin && region.contains(origin) ? origin : null;
      return;
    }

    const origin = restoreFocus.current;
    restoreFocus.current = null;
    if (!origin) return;
    // A toolbar control the user chose during loading keeps its focus.
    if (
      document.activeElement !== document.body &&
      document.activeElement !== origin
    )
      return;

    const label = origin.getAttribute("aria-label");
    const target = region.contains(origin)
      ? origin
      : label
        ? Array.from(region.querySelectorAll<HTMLElement>("[aria-label]")).find(
            (element) =>
              element.tagName === origin.tagName &&
              element.getAttribute("aria-label") === label,
          )
        : null;
    if (!target) return;
    if (!target.matches(":disabled")) {
      target.focus({ preventScroll: true });
      return;
    }

    // At a page boundary, the initiating pagination button may become disabled.
    const controls = Array.from(
      target.closest("nav")?.querySelectorAll<HTMLElement>("button") ?? [],
    );
    const position = controls.indexOf(target);
    const nearest = controls
      .filter((control) => !control.matches(":disabled"))
      .sort(
        (first, second) =>
          Math.abs(controls.indexOf(first) - position) -
          Math.abs(controls.indexOf(second) - position),
      )[0];
    nearest?.focus({ preventScroll: true });
  }, [pending, focusOrigin]);

  return (
    <div className="relative">
      <div
        ref={content}
        aria-busy={pending}
        inert={pending}
        className={cn(
          "transition-[opacity,filter] duration-200 motion-reduce:transition-none",
          pending && "pointer-events-none opacity-60",
          pending && blur && "blur-sm motion-reduce:blur-none",
        )}
      >
        {children}
      </div>
      {pending && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-10 flex justify-center",
            indicator ? "items-start" : "items-center",
          )}
        >
          {indicator ? (
            <div className="sticky top-8">{indicator}</div>
          ) : (
            <LoaderIcon className="size-6 animate-spin text-foreground-dimmed motion-reduce:animate-none" />
          )}
        </div>
      )}
    </div>
  );
};
