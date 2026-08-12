"use client";

import type { Icon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const INTERVAL_MS = 3400;
const EASE = [0.22, 1, 0.36, 1] as const;

export type StepCycleItem = {
  icon: Icon;
  title: string;
  description: string;
};

export const VerticalStepCycle = ({
  steps,
  layoutId = "step-cycle-underline",
}: {
  steps: readonly StepCycleItem[];
  layoutId?: string;
}) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % steps.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [steps.length]);

  const step = steps[index];
  if (!step) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background-rich">
      <div className="relative flex min-h-0 flex-1 flex-col justify-end overflow-hidden px-6 py-8 md:px-8 md:py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(8px)" }}
            transition={{ duration: 0.45, ease: EASE }}
            className="flex max-w-xl flex-col gap-4"
          >
            <div className="flex items-center gap-3">
              <span className="font-normal text-lg text-primary-text tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <step.icon className="size-6 text-primary" />
            </div>
            <h4 className="font-body font-medium text-3xl text-foreground md:text-4xl">
              {step.title}
            </h4>
            <p className="font-light text-foreground-dimmed text-lg leading-relaxed">
              {step.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        className="grid shrink-0 gap-px border-accent-foreground border-t bg-accent-foreground"
        style={{
          gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
        }}
      >
        {steps.map((entry, entryIndex) => {
          const active = entryIndex === index;

          return (
            <button
              key={entry.title}
              type="button"
              onClick={() => setIndex(entryIndex)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "relative flex flex-col gap-2 bg-background-rich px-3 py-4 text-left transition-colors md:px-5 md:py-5",
                !active && "bg-background-dimmed",
              )}
            >
              <span
                className={cn(
                  "font-normal text-sm tabular-nums transition-colors",
                  active ? "text-primary" : "text-foreground-dimmed/50",
                )}
              >
                {String(entryIndex + 1).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "font-body font-medium text-sm transition-colors md:text-base",
                  active ? "text-foreground" : "text-foreground-dimmed",
                )}
              >
                {entry.title}
              </span>
              {active ? (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-primary"
                  transition={{ duration: 0.4, ease: EASE }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};
