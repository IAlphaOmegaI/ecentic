"use client";

import { type DebouncedFunction, debounce } from "es-toolkit/function";
import { useEffect, useInsertionEffect, useMemo, useRef } from "react";

type DebounceOptions = Parameters<typeof debounce>[2];

/**
 * Custom hook that creates a debounced version of a callback function.
 * @template T - Type of the original callback function.
 * @param callback - The callback function to be debounced.
 * @param delay - The delay in milliseconds before the callback is invoked (default is `500` milliseconds).
 * @param options - Options to control the behavior of the debounced function.
 * @returns A debounced version of the original callback along with control functions.
 * @example
 * ```tsx
 * const debouncedCallback = useDebounceCallback(
 *   (searchTerm) => {
 *     // Perform search after user stops typing for 500 milliseconds
 *     searchApi(searchTerm);
 *   },
 *   500
 * );
 *
 * // Later in the component
 * debouncedCallback('react hooks'); // Will invoke the callback after 500 milliseconds of inactivity.
 * ```
 */

// biome-ignore lint/suspicious/noExplicitAny: function arguments are unknown
export const useDebounceCallback = <T extends (...args: any) => ReturnType<T>>(
  callback: T,
  delay = 500,
  options?: DebounceOptions,
): DebouncedFunction<T> => {
  // The latest render's callback, read at fire time: the debounced instance
  // must survive re-renders (an inline callback changing identity every render
  // would otherwise reset — or cancel — the pending timer on each keystroke).
  // Insertion effects run before layout effects, so even a leading-edge fire
  // from a layout effect sees the freshly committed callback.
  const callbackRef = useRef(callback);
  useInsertionEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useMemo(
    () =>
      debounce(
        ((...args) => callbackRef.current(...args)) as T,
        delay,
        options,
      ),
    [delay, options],
  );

  // Cancel the instance that was actually handed out — both when a new one
  // replaces it and on unmount — so no pending invocation outlives its owner.
  useEffect(() => {
    return () => debouncedCallback.cancel();
  }, [debouncedCallback]);

  return debouncedCallback;
};
