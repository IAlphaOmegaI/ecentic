"use client";

import { type ThrottledFunction, throttle } from "es-toolkit/function";
import { useEffect, useMemo, useRef } from "react";

type ThrottleOptions = Parameters<typeof throttle>[2];

/**
 * Custom hook that creates a throttled version of a callback function.
 * @template T - Type of the original callback function.
 * @param callback - The callback function to be throttled.
 * @param interval - The interval in milliseconds during which the callback will be invoked at most once (default is `500` milliseconds).
 * @param options - Options to control the behavior of the throttled function.
 * @returns A throttled version of the original callback along with control functions.
 * @example
 * ```tsx
 * const throttledCallback = useThrottleCallback(
 *   (scrollPosition) => {
 *     // Perform action at most once every 500 milliseconds while scrolling
 *     trackScroll(scrollPosition);
 *   },
 *   500
 * );
 *
 * // Later in the component
 * throttledCallback(window.scrollY); // Will invoke the callback at most once every 500ms while scrolling.
 * ```
 */

// biome-ignore lint/suspicious/noExplicitAny: function arguments are unknown
export const useThrottleCallback = <T extends (...args: any) => ReturnType<T>>(
  callback: T,
  interval = 500,
  options?: ThrottleOptions,
): ThrottledFunction<T> => {
  const throttledCallback = useMemo(
    () => throttle(callback, interval, options),
    [callback, interval, options],
  );
  const throttledCallbackRef = useRef(throttledCallback);

  useEffect(() => {
    throttledCallbackRef.current = throttle(callback, interval, options);
  }, [callback, interval, options]);

  useEffect(() => {
    return () => throttledCallbackRef.current.cancel();
  }, []);

  return throttledCallback;
};
