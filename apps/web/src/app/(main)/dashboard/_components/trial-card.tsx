"use client";

import { ArrowRightIcon, CheckIcon, XIcon } from "@zenncore/icons";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Spring } from "@/lib/animations";

const proFeatures = [
  "Unlimited AI simulations",
  "All 3 model perspectives",
  "Competitor auto-detection",
  "UCP structured data export",
  "Priority support",
] as const;

const TRIAL_DAYS_LEFT = 7;

export const TrialCard = () => {
  const [upgrade, setUpgrade] = useState(false);

  return (
    <>
      <div className="border-accent-foreground border-t">
        <button
          type="button"
          onClick={() => setUpgrade(true)}
          className="group w-full px-4 py-4 text-left transition-colors hover:bg-accent-foreground/30"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="relative inline-flex size-2">
                <motion.span
                  className="absolute inline-block size-full rounded-full bg-warning"
                  animate={{ scale: [1, 2.2], opacity: [0.8, 0] }}
                  transition={{
                    duration: 0.8,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeOut",
                  }}
                />
                <span className="relative inline-block size-2 rounded-full bg-warning" />
              </span>
              <span className="font-medium text-warning text-xs uppercase tracking-widest">
                Free Trial
              </span>
            </div>
            <span className="font-mono text-foreground-dimmed text-xs tabular-nums">
              {TRIAL_DAYS_LEFT}d left
            </span>
          </div>
          <div className="mb-2 h-1 w-full bg-accent-foreground">
            <div
              className="h-full bg-warning/60 transition-all"
              style={{
                width: `${Math.round((TRIAL_DAYS_LEFT / 14) * 100)}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-light text-foreground-dimmed text-xs">
              Upgrade before it ends
            </span>
            <ArrowRightIcon className="size-3 text-warning transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>
      </div>

      <AnimatePresence>
        {upgrade && (
          <>
            <motion.div
              key="upgrade-backdrop"
              className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setUpgrade(false)}
            />

            <motion.div
              key="upgrade-panel"
              className="fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 border border-accent-foreground bg-background-rich shadow-2xl"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Header */}
              <div className="flex items-start justify-between border-accent-foreground border-b px-6 py-5">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <motion.span
                      className="inline-block size-1.5 rounded-full bg-warning"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    />
                    <span className="font-medium text-warning text-xs uppercase tracking-widest">
                      Trial ending in {TRIAL_DAYS_LEFT} days
                    </span>
                  </div>
                  <h2 className="font-medium text-foreground text-xl leading-tight">
                    Upgrade to Pro
                  </h2>
                  <p className="mt-1 font-light text-foreground-dimmed text-sm">
                    Keep full access to simulations, insights, and competitor
                    intelligence.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUpgrade(false)}
                  className="flex size-7 shrink-0 items-center justify-center text-foreground-dimmed transition-colors hover:text-foreground"
                >
                  <XIcon className="size-4" />
                </button>
              </div>

              {/* Trial progress */}
              <div className="border-accent-foreground border-b px-6 py-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-light text-foreground-dimmed text-xs">
                    Trial progress
                  </span>
                  <span className="font-mono text-foreground-dimmed text-xs">
                    {14 - TRIAL_DAYS_LEFT}/14 days used
                  </span>
                </div>
                <div className="h-1.5 w-full bg-accent-foreground">
                  <motion.div
                    className="h-full bg-warning"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.round(((14 - TRIAL_DAYS_LEFT) / 14) * 100)}%`,
                    }}
                    transition={{ ...Spring.Gentle, delay: 0.2 }}
                  />
                </div>
              </div>

              {/* Features */}
              <div className="border-accent-foreground border-b px-6 py-5">
                <p className="mb-3 font-medium text-foreground-dimmed text-xs uppercase tracking-widest">
                  Everything in Pro
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {proFeatures.map((feature, index) => (
                    <motion.div
                      key={feature}
                      className="flex items-center gap-2.5"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        ...Spring.Snappy,
                        delay: 0.1 + index * 0.05,
                      }}
                    >
                      <div className="flex size-4 shrink-0 items-center justify-center bg-primary/10">
                        <CheckIcon className="size-3 text-primary" />
                      </div>
                      <span className="font-light text-foreground text-sm">
                        {feature}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Pricing + CTA */}
              <div className="px-6 py-5">
                <div className="mb-4 flex items-end gap-1.5">
                  <span className="font-semibold text-4xl text-foreground leading-none">
                    $99
                  </span>
                  <span className="mb-1 font-light text-foreground-dimmed text-sm">
                    /month
                  </span>
                </div>

                <button
                  type="button"
                  className="mb-2 w-full bg-primary py-3 font-medium text-sm text-white transition-colors hover:bg-primary/90"
                  onClick={() => setUpgrade(false)}
                >
                  Upgrade Now
                </button>
                <button
                  type="button"
                  onClick={() => setUpgrade(false)}
                  className="w-full py-2 font-light text-foreground-dimmed text-xs transition-colors hover:text-foreground"
                >
                  Maybe later — {TRIAL_DAYS_LEFT} days remaining
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
