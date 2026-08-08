"use client";

import NumberFlow from "@number-flow/react";
import { cn } from "@zenncore/utils";
import { useInView } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

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

export const Counter = ({ value, delay = 0, className }: CounterProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const parsed = useMemo(() => parse(value), [value]);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!inView) return;

    const timeout = setTimeout(() => setStarted(true), delay * 1000);

    return () => clearTimeout(timeout);
  }, [inView, delay]);

  if (!parsed) return <span className={className}>{value}</span>;

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      <NumberFlow
        value={started ? parsed.target : 0}
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
