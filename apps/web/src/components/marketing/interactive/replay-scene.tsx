"use client";

import { CheckIcon, FileSearchIcon, UserIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import type { AppConfig } from "next-intl";
import { IllustrationGlow } from "@/components/marketing/illustration-glow";
import { Motion } from "@/components/motion";
import { agentReplay } from "@/content/examples/agent-replay";

export type ReplayCopy = AppConfig["Messages"]["interactiveReplay"];
export type ReplayLabels = AppConfig["Messages"]["reviewReplay"];
export type ReplayStage = (typeof agentReplay.stages)[number];

export const ReplayScene = ({
  stage,
  field = 0,
  copy,
  labels,
  locale,
  animated = false,
}: {
  stage: ReplayStage;
  field?: number;
  copy: ReplayCopy;
  labels: ReplayLabels;
  locale: string;
  animated?: boolean;
}) => {
  const fixed = stage === "fix" || stage === "rerun";
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: agentReplay.currency,
    maximumFractionDigits: 0,
  });
  const number = new Intl.NumberFormat(locale);
  const activeField =
    stage === "fields" ? agentReplay.fields[field] : undefined;
  const selected =
    stage === "pick" ? "rival" : stage === "rerun" ? "own" : undefined;
  const summary = {
    question: copy.questionNote,
    listings: copy.listingNote,
    fields: copy.fieldsNote,
    pick: copy.pickReason,
    fix: copy.fixNote,
    rerun: copy.rerunReason,
  }[stage];
  const value = (
    key: (typeof agentReplay.fields)[number],
    listing: typeof agentReplay.own | typeof agentReplay.rival,
  ) => {
    switch (key) {
      case "price":
        return currency.format(listing.price);
      case "seatHeight":
        return `${number.format(listing.seatHeight.minimum)}–${number.format(listing.seatHeight.maximum)} ${copy.units.centimeters}`;
      case "capacity":
        return `${number.format(listing.capacity)} ${copy.units.kilograms}`;
      case "variants":
        return `${number.format(listing.variants)} ${copy.units.variants}`;
    }
  };
  return (
    <div
      data-replay-scene={stage}
      className="relative isolate min-w-0 overflow-hidden"
    >
      <IllustrationGlow />
      {stage === "question" ? (
        <div className="flex min-h-[440px] flex-col justify-center gap-8 px-8 py-12 max-sm:min-h-0 max-sm:px-4">
          <p className="flex items-center gap-2 text-background-rich/60 text-sm">
            <UserIcon aria-hidden className="size-4" />
            {copy.questionLabel}
          </p>
          <Motion.Item
            initial={
              animated ? { opacity: 0, transform: "translateY(8px)" } : false
            }
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{
              duration: animated ? 0.22 : 0,
              ease: [0.23, 1, 0.32, 1],
            }}
          >
            <blockquote className="max-w-[20ch] font-heading text-4xl text-background-rich leading-tight max-sm:text-3xl">
              {copy.question}
            </blockquote>
          </Motion.Item>
          <div className="grid grid-cols-2 gap-8 border-background-rich/15 border-t pt-8 max-sm:gap-4">
            <div>
              <p className="mb-4 text-background-rich/50 text-sm">
                {labels.budget}
              </p>
              <p className="font-heading text-3xl text-background-rich">
                {currency.format(agentReplay.budget)}
              </p>
            </div>
            <div>
              <p className="mb-4 text-background-rich/50 text-sm">
                {labels.criteria}
              </p>
              <p className="text-background-rich/80">
                {copy.fields.seatHeight}
                <br />
                {copy.fields.capacity}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-8 pt-8 max-sm:px-4">
          <div className="relative mx-auto mb-8 flex size-20 items-center justify-center rounded-full border border-primary-rich/40 bg-primary/8 text-primary-rich">
            <span
              aria-hidden
              className="absolute -inset-4 rounded-full border border-background-rich/10"
            />
            <FileSearchIcon aria-hidden className="size-8" />
            <Motion.Item
              aria-hidden
              initial={
                animated ? { opacity: 0, transform: "scale(0.92)" } : false
              }
              animate={{ opacity: 1, transform: "scale(1)" }}
              transition={{ duration: animated ? 0.22 : 0 }}
              className="absolute inset-0 rounded-full border border-primary-rich/40"
            />
          </div>
          <p className="mb-8 text-center text-background-rich/65 text-sm">
            {activeField
              ? `${copy.reading}: ${copy.fields[activeField]}`
              : selected
                ? labels.complete
                : labels.inspection}
          </p>
          <div className="relative grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            {(["own", "rival"] as const).map((side, index) => (
              <Motion.Item
                key={side}
                initial={
                  animated
                    ? {
                        opacity: 0.4,
                        transform: `translateY(${index ? 8 : 4}px)`,
                      }
                    : false
                }
                animate={{ opacity: 1, transform: "translateY(0px)" }}
                transition={{
                  duration: animated ? 0.22 : 0,
                  ease: [0.23, 1, 0.32, 1],
                }}
                className={cn(
                  "relative min-w-0 rounded-md border bg-emphasis-dimmed px-6 py-6 max-sm:px-4",
                  selected === side
                    ? "border-primary-rich/65 shadow-[0_0_40px_color-mix(in_srgb,var(--color-primary)_12%,transparent)]"
                    : "border-background-rich/20",
                )}
              >
                <header className="min-h-28 border-background-rich/15 border-b pb-6">
                  <p className="mb-4 flex items-center justify-between gap-4 text-background-rich/55 text-sm">
                    {copy.listing[side]}
                    {selected === side && (
                      <CheckIcon
                        aria-hidden
                        className="size-4 text-primary-rich"
                      />
                    )}
                  </p>
                  <h4 className="font-heading text-background-rich text-xl">
                    {side === "own"
                      ? copy.listing.ownTitle
                      : copy.listing.rivalTitle}
                  </h4>
                </header>
                <dl className="mt-6 flex flex-col gap-6">
                  {agentReplay.fields.map((key) => {
                    const missing =
                      side === "own" &&
                      !fixed &&
                      agentReplay.missing.some((item) => item === key);
                    return (
                      <div
                        key={key}
                        className={cn(
                          "relative",
                          activeField === key &&
                            "before:absolute before:inset-y-0 before:-left-6 before:w-0.5 before:bg-primary-rich max-sm:before:-left-4",
                        )}
                      >
                        <dt
                          className={cn(
                            "mb-2 text-xs",
                            activeField === key
                              ? "text-primary-rich"
                              : "text-background-rich/50",
                          )}
                        >
                          {copy.fields[key]}
                        </dt>
                        <dd
                          className={cn(
                            "text-sm",
                            missing
                              ? "text-warning-rich"
                              : "text-background-rich",
                          )}
                        >
                          {missing
                            ? copy.comparison.missing
                            : value(key, agentReplay[side])}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </Motion.Item>
            ))}
          </div>
        </div>
      )}
      <div className="px-8 py-8 max-sm:px-4">
        <div className="border-background-rich/15 border-t pt-6">
          <p className="mb-4 flex items-center gap-2 text-primary-rich text-xs">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-primary-rich"
            />
            {selected
              ? stage === "pick"
                ? copy.pickLabel
                : copy.rerunLabel
              : labels.summary}
          </p>
          <Motion.Item
            key={`${stage}-${field}`}
            initial={
              animated ? { opacity: 0, transform: "translateY(4px)" } : false
            }
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: animated ? 0.2 : 0, ease: "easeOut" }}
          >
            <p className="max-w-[64ch] text-background-rich/75 text-sm leading-relaxed">
              {activeField
                ? `${copy.reading}: ${copy.fields[activeField]}. ${agentReplay.missing.some((key) => key === activeField) ? copy.missingReading : copy.presentReading}`
                : summary}
            </p>
          </Motion.Item>
          {stage === "rerun" && (
            <p className="mt-4 text-background-rich/50 text-xs leading-relaxed">
              {copy.outcomeNote}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
