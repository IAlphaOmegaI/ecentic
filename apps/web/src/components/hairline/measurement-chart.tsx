"use client";

import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { useId, useState } from "react";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import { Motion } from "@/components/motion";

/** Hairline's visual grammar, with fixed quantitative geometry rather than its decorative Plot. */
export const MeasurementDial = ({
  value,
  maximum = 100,
  label,
  remainingLabel,
}: MeasurementDial.Props) => {
  const { reduced } = useInteractive();
  const readoutId = useId();
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const engaged = hovered || focused;
  const percentage = Math.max(0, Math.min(100, (value / maximum) * 100));
  return (
    <Motion.Item
      data-measurement="dial"
      role="img"
      aria-label={`${label}: ${value} / ${maximum}`}
      aria-describedby={readoutId}
      data-measurement-engaged={engaged}
      tabIndex={0}
      initial={false}
      animate={{
        rotateX: reduced ? 0 : pointer.y,
        rotateY: reduced ? 0 : pointer.x,
      }}
      transition={{ type: "spring", stiffness: 180, damping: 26 }}
      style={{ transformPerspective: reduced ? undefined : 900 }}
      onPointerMove={(event) => {
        if (reduced || event.pointerType !== "mouse") return;
        const bounds = event.currentTarget.getBoundingClientRect();
        setPointer({
          x: ((event.clientX - bounds.left) / bounds.width - 0.5) * 8,
          y: -((event.clientY - bounds.top) / bounds.height - 0.5) * 8,
        });
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setPointer({ x: 0, y: 0 });
        setHovered(false);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="relative my-3 aspect-square w-full max-w-88 rounded-full outline-offset-8 focus-visible:outline-2 focus-visible:outline-primary"
    >
      <svg
        aria-hidden
        viewBox="0 0 360 360"
        className="absolute inset-0 size-full fill-none"
      >
        <circle
          cx="180"
          cy="184"
          r="163"
          className="stroke-accent-foreground"
        />
        <circle
          cx="180"
          cy="180"
          r="163"
          className="stroke-accent-foreground"
        />
        <circle
          cx="180"
          cy="180"
          r="126"
          className={engaged ? "stroke-primary/50" : "stroke-accent-foreground"}
        />
        <circle cx="180" cy="180" r="119" className="stroke-primary/10" />
        {Array.from({ length: 100 }, (_, index) => index + 1).map((tick) => (
          <line
            key={tick}
            x1="180"
            y1="26"
            x2="180"
            y2={tick % 5 === 0 ? "44" : "36"}
            transform={`rotate(${(tick - 1) * 3.6} 180 180)`}
            strokeWidth={tick <= percentage ? 2 : 1}
            className={
              tick <= percentage ? "stroke-primary" : "stroke-accent-foreground"
            }
          />
        ))}
        <circle
          cx="180"
          cy="18"
          r="3"
          transform={`rotate(${percentage * 3.6} 180 180)`}
          className="fill-primary stroke-primary"
        />
      </svg>
      <div
        aria-hidden
        className="absolute inset-0 flex flex-col items-center justify-center text-center"
      >
        <div className="flex items-baseline gap-2">
          <strong className="font-heading font-medium text-7xl xl:text-8xl text-foreground-rich leading-none tracking-tighter">
            {value}
          </strong>
          <span className="text-foreground-dimmed">/ {maximum}</span>
        </div>
        <p className="mt-3 max-w-40 text-foreground-dimmed text-sm">{label}</p>
      </div>
      <Motion.Item
        id={readoutId}
        initial={false}
        animate={{ opacity: engaged ? 1 : 0 }}
        transition={{ duration: reduced ? 0 : 0.16 }}
        className="absolute inset-x-0 top-[70%] flex flex-col items-center text-center text-primary-text"
      >
        <strong className="font-heading text-xl tabular-nums">
          {Math.max(0, maximum - value)}
        </strong>
        <span className="mt-0.5 text-xs">{remainingLabel}</span>
      </Motion.Item>
    </Motion.Item>
  );
};
export namespace MeasurementDial {
  export type Props = {
    value: number;
    maximum?: number;
    label: string;
    remainingLabel: string;
  };
}

export const MeasurementBars = ({
  entries,
  maximum,
  ticks,
  label,
}: MeasurementBars.Props) => {
  const { reduced } = useInteractive();
  const [selected, setSelected] = useState(entries[0]?.key);
  return (
    <figure data-measurement="columns" className="m-0 min-w-0">
      <figcaption className="mb-8 text-foreground-dimmed text-sm">
        {label}
      </figcaption>
      <div className="relative ml-10 h-48 min-w-0">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {ticks.map((tick, index) => (
            <div
              key={tick}
              className="absolute inset-x-0 border-accent-foreground border-t"
              style={{ bottom: `${(index / (ticks.length - 1)) * 100}%` }}
            >
              <span className="absolute right-full -mt-2 mr-3 whitespace-nowrap text-xs text-foreground-dimmed tabular-nums">
                {tick}
              </span>
            </div>
          ))}
        </div>
        <div
          className="absolute inset-0 grid items-end gap-6 px-3 sm:gap-10 sm:px-5"
          style={{
            gridTemplateColumns: `repeat(${entries.length}, minmax(0,1fr))`,
          }}
        >
          {entries.map((entry) => (
            <div
              key={entry.key}
              className="relative h-full min-w-0"
              onPointerEnter={() => setSelected(entry.key)}
            >
              <Motion.Item
                aria-hidden
                data-measured-value={entry.value}
                data-measured-maximum={maximum}
                initial={false}
                animate={{
                  height: `${Math.max(0, Math.min(100, ((entry.value ?? 0) / maximum) * 100))}%`,
                }}
                transition={{
                  duration: reduced ? 0 : 0.3,
                  ease: [0.22, 0.68, 0, 1],
                }}
                className={cn(
                  "absolute inset-x-0 bottom-0 rounded-t-sm border border-b-0",
                  entry.primary
                    ? "border-primary bg-primary/8"
                    : "border-foreground-dimmed/70 bg-background-rich",
                  selected === entry.key && "border-primary bg-primary/8",
                )}
              >
                <span
                  className={cn(
                    "absolute inset-x-2 top-1 h-px",
                    selected === entry.key
                      ? "bg-primary/40"
                      : "bg-accent-foreground",
                  )}
                />
              </Motion.Item>
              <div
                aria-hidden
                className="absolute inset-y-0 left-1/2 border-accent-foreground/60 border-l border-dashed"
              />
            </div>
          ))}
        </div>
      </div>
      <div
        className="mt-4 grid gap-2 pl-10"
        style={{
          gridTemplateColumns: `repeat(${entries.length}, minmax(0,1fr))`,
        }}
      >
        {entries.map((entry) => (
          <div
            key={entry.key}
            className="grid min-w-0 grid-rows-[3.5rem_auto] content-start gap-1 text-center [&_button]:h-full [&_button]:w-full max-sm:[&_button]:px-0"
          >
            <Button
              variant="ghost"
              color={selected === entry.key ? "primary" : "neutral"}
              aria-pressed={selected === entry.key}
              aria-label={`${entry.label}: ${entry.formatted}`}
              onPointerEnter={() => setSelected(entry.key)}
              onFocus={() => setSelected(entry.key)}
              onClick={() => setSelected(entry.key)}
            >
              <span className="min-w-0 whitespace-normal font-medium text-sm leading-snug max-sm:text-xs">
                {entry.label}
              </span>
            </Button>
            <span
              className={cn(
                "whitespace-nowrap font-heading text-base tabular-nums max-sm:text-xs",
                entry.primary ? "text-primary-text" : "text-foreground-rich",
              )}
            >
              {entry.formatted}
            </span>
          </div>
        ))}
      </div>
    </figure>
  );
};
export namespace MeasurementBars {
  export type Props = {
    label: string;
    maximum: number;
    ticks: readonly string[];
    entries: readonly {
      key: string;
      label: string;
      value: number | null;
      formatted: string;
      primary?: boolean;
    }[];
  };
}

/** Fixed 0–100% evidence scale. The indicator moves only when its data changes. */
export const MeasurementRule = ({
  percentage,
  labels,
  tone = "primary",
}: MeasurementRule.Props) => {
  const { reduced } = useInteractive();
  const value = Math.max(0, Math.min(100, percentage));
  return (
    <div aria-hidden data-measurement="rule" className="relative pt-5 pb-6">
      <div className="relative h-3 rounded-sm border border-accent-foreground">
        <Motion.Item
          initial={false}
          animate={{ width: `${value}%` }}
          transition={{ duration: reduced ? 0 : 0.3 }}
          className={cn(
            "absolute inset-y-0 left-0 rounded-sm border bg-background-rich",
            tone === "success"
              ? "border-success bg-success/10"
              : tone === "warning"
                ? "border-warning bg-warning/10"
                : tone === "error"
                  ? "border-error bg-error/10"
                  : "border-primary bg-primary/10",
          )}
        />
        {Array.from({ length: 21 }, (_, index) => index).map((tick) => (
          <span
            key={tick}
            className={cn(
              "absolute bottom-full mb-1 w-px bg-accent-foreground",
              tick % 5 === 0 ? "h-2" : "h-1",
            )}
            style={{ left: `${tick * 5}%` }}
          />
        ))}
        <span className="absolute top-full left-0 mt-2 text-foreground-dimmed text-xs">
          {labels[0]}
        </span>
        <span className="absolute top-full left-1/2 mt-2 -translate-x-1/2 text-foreground-dimmed text-xs">
          {labels[1]}
        </span>
        <span className="absolute top-full right-0 mt-2 text-foreground-dimmed text-xs">
          {labels[2]}
        </span>
      </div>
    </div>
  );
};
export namespace MeasurementRule {
  export type Props = {
    percentage: number;
    labels: readonly [string, string, string];
    tone?: "primary" | "success" | "warning" | "error";
  };
}
