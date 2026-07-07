"use client";

import { cn } from "@zenncore/utils";
import { animate, useInView, useReducedMotion } from "motion/react";
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

  return { prefix, suffix, target: Number(number), decimals: fractional.length };
};

export const Counter = ({ value, delay = 0, className }: CounterProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const reduceMotion = useReducedMotion();
  const parsed = useMemo(() => parse(value), [value]);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!parsed || !inView) return;

    if (reduceMotion) {
      setDisplay(parsed.target);
      return;
    }

    const controls = animate(0, parsed.target, {
      duration: 1.2,
      delay,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(latest),
    });

    return () => controls.stop();
  }, [parsed, inView, reduceMotion, delay]);

  if (!parsed) return <span className={className}>{value}</span>;

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      <span aria-hidden>
        {parsed.prefix}
        {display.toFixed(parsed.decimals)}
        {parsed.suffix}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
};
