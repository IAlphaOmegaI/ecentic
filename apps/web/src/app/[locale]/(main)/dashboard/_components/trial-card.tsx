"use client";

import { ArrowRightIcon, CheckIcon, XIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { AnimatePresence, motion } from "motion/react";
import { useMessages, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Spring } from "@/lib/animations";

/**
 * Every number here arrives as a prop from the stored subscription row — see
 * `TrialStatus` in `sidebar.tsx`. The component used to hardcode seven days
 * left, divide by a trial length of fourteen that nothing sold, and quote $99,
 * which is not a price on any plan; it was harmless only because nothing
 * rendered it. `progress` is null when the row carries no period start, in
 * which case the bar is dropped rather than drawn against an invented total.
 */
export type TrialCardProps = {
  plan: string;
  price: string | null;
  daysLeft: number;
  endsOn: string;
  progress: { used: number; total: number; percent: number } | null;
};

export const TrialCard = ({
  plan,
  price,
  daysLeft,
  endsOn,
  progress,
}: TrialCardProps) => {
  const [upgrade, setUpgrade] = useState(false);
  const translate = useTranslations("dashboard.trial");
  const messages = useMessages();
  const features = messages.dashboard.trial.features;

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
              <span className="inline-block size-2 bg-warning" />
              <span className="font-medium text-warning text-xs uppercase tracking-[0.2em]">
                {translate("badge")}
              </span>
            </div>
            <span className="font-mono text-foreground-dimmed text-xs tabular-nums">
              {translate("daysLeft", { days: String(daysLeft) })}
            </span>
          </div>

          {progress && (
            <div className="mb-2 h-1 w-full bg-accent-foreground">
              <div
                className="h-full bg-warning/60 transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          )}

          {/* A date is what stops the support email; a day count alone does not. */}
          <div className="mb-2 font-light text-foreground-dimmed text-xs">
            {translate("endsOn", { date: endsOn })}
          </div>

          <div className="flex items-center justify-between">
            <span className="font-light text-foreground-dimmed text-xs">
              {translate("upgradeHint")}
            </span>
            <ArrowRightIcon className="size-4 text-warning transition-transform group-hover:translate-x-0.5" />
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
              <div className="flex items-start justify-between border-accent-foreground border-b px-6 py-5">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <motion.span
                      className="inline-block size-1.5 bg-warning"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    />
                    <span className="font-medium text-warning text-xs uppercase tracking-[0.2em]">
                      {translate("modal.endingIn", { date: endsOn })}
                    </span>
                  </div>
                  <h2 className="font-medium text-foreground text-xl leading-tight">
                    {translate("modal.title", { plan })}
                  </h2>
                  <p className="mt-1 font-light text-foreground-dimmed text-sm">
                    {translate("modal.description")}
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

              {progress && (
                <div className="border-accent-foreground border-b px-6 py-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-light text-foreground-dimmed text-xs">
                      {translate("modal.progress")}
                    </span>
                    <span className="font-mono text-foreground-dimmed text-xs">
                      {translate("modal.daysUsed", {
                        used: String(progress.used),
                        total: String(progress.total),
                      })}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-accent-foreground">
                    <motion.div
                      className="h-full bg-warning"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.percent}%` }}
                      transition={{ ...Spring.Gentle, delay: 0.2 }}
                    />
                  </div>
                </div>
              )}

              <div className="border-accent-foreground border-b px-6 py-5">
                <p className="mb-3 font-medium text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
                  {translate("modal.featuresHeading", { plan })}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {features.map((feature, index) => (
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
                      <div className="flex size-5 shrink-0 items-center justify-center">
                        <CheckIcon className="size-4 text-primary" />
                      </div>
                      <span className="font-light text-foreground text-sm">
                        {feature}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="px-6 py-5">
                {/* Read from the pricing catalog, never restated here — a price
                    typed into a component is one edit away from disagreeing with
                    what Stripe charges. */}
                {price && (
                  <div className="mb-4 flex items-end gap-1.5">
                    <span className="font-semibold text-4xl text-foreground leading-none">
                      {price}
                    </span>
                    <span className="mb-1 font-light text-foreground-dimmed text-sm">
                      {translate("modal.pricePerMonth")}
                    </span>
                  </div>
                )}

                <Button
                  color="primary"
                  render={<Link href="/dashboard/settings" />}
                  onClick={() => setUpgrade(false)}
                  className="mb-2 w-full py-3 font-medium text-sm transition-colors"
                >
                  {translate("modal.action.primary")}
                </Button>
                <button
                  type="button"
                  onClick={() => setUpgrade(false)}
                  className="w-full py-2 font-light text-foreground-dimmed text-xs transition-colors hover:text-foreground"
                >
                  {translate("modal.action.secondary", {
                    days: String(daysLeft),
                  })}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
