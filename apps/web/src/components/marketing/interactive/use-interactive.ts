"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useDocument } from "@/hooks/use-document";

/** First render is complete static HTML; enhancement never hides the no-JS explanation. */
export const useInteractive = () => {
  const { window } = useDocument();
  const subscribe = useCallback(
    (changed: () => void) => {
      const query = window?.matchMedia("(prefers-reduced-motion: reduce)");
      query?.addEventListener("change", changed);
      return () => query?.removeEventListener("change", changed);
    },
    [window],
  );
  const snapshot = useCallback(
    () =>
      window?.matchMedia("(prefers-reduced-motion: reduce)").matches ?? true,
    [window],
  );
  const reduced = useSyncExternalStore(subscribe, snapshot, () => true);
  return { ready: window !== null, reduced };
};
