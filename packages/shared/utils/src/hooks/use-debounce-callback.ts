"use client";

import { type DebouncedFunction, debounce } from "es-toolkit/function";
import { useEffect, useMemo, useRef } from "react";

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
  const debouncedCallback = useMemo(
    () => debounce(callback, delay, options),
    [callback, delay, options],
  );
  const debouncedCallbackRef = useRef(debouncedCallback);

  useEffect(() => {
    debouncedCallbackRef.current = debounce(callback, delay, options);
  }, [callback, delay, options]);

  useEffect(() => {
    return () => debouncedCallbackRef.current.cancel();
  }, []);

  return debouncedCallback;
};
