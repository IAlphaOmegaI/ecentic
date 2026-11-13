"use client";

import NumberFlow from "@number-flow/react";
import { cn } from "@zenncore/utils";
import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type CounterProps = {
  value: string;
  delay?: number;
  className?: string;
};

// Splits "+15%" into { prefix: "+", target: 15, suffix: "%", decimals: 0 }
const parse = (value: string) => {
  const match = value.match(/^(\D*)(-?\d+(?:\.\d+)?)(.*)$/);

  if (!match) return null;

  const prefix = match[1] ?? "";
  const number = match[2] ?? "";
  const suffix = match[3] ?? "";
  const fractional = number.split(".")[1] ?? "";

  return {
    prefix,
    suffix,
    target: Number(number),
    decimals: fractional.length,
  };
};

const TIMING = { duration: 1200, easing: "ease-out" } as const;

/**
 * `settled` shows the figure as plain text, and is what the server renders:
 * crawlers, link previews and agents that never run JavaScript have to read
 * "20%", not the 0 the count starts from. `armed` drops to that 0 before the
 * first client paint, and `counting` runs it up once the figure is in view.
 */
type Phase = "settled" | "armed" | "counting";

export const Counter = ({ value, delay = 0, className }: CounterProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const reducedMotion = useReducedMotion();
  const parsed = useMemo(() => parse(value), [value]);
  const [phase, setPhase] = useState<Phase>("settled");

  // A layout effect, so the drop to 0 lands before the browser paints the
  // settled figure on a client-side mount. On the marketing pages the figure
  // is still hidden by its Reveal parent when this runs, so it never shows.
  useLayoutEffect(() => {
    if (reducedMotion) return;
    setPhase("armed");
  }, [reducedMotion]);

  useEffect(() => {
    if (!inView || phase !== "armed") return;

    const timeout = setTimeout(() => setPhase("counting"), delay * 1000);

    return () => clearTimeout(timeout);
  }, [inView, phase, delay]);

  if (!parsed || phase === "settled")
    return (
      <span ref={ref} className={cn("tabular-nums", className)}>
        {value}
      </span>
    );

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      <NumberFlow
        value={phase === "counting" ? parsed.target : 0}
        prefix={parsed.prefix}
        suffix={parsed.suffix}
        format={{
          minimumFractionDigits: parsed.decimals,
          maximumFractionDigits: parsed.decimals,
        }}
        transformTiming={TIMING}
        spinTiming={TIMING}
      />
    </span>
  );
};
