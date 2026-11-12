"use client";

import { CheckIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import type { AppConfig } from "next-intl";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { agentReplay } from "@/content/examples/agent-replay";

export type ReplayCopy = AppConfig["Messages"]["interactiveReplay"];
export type ReplayLabels = AppConfig["Messages"]["reviewReplay"];
export type ReplayStage = (typeof agentReplay.stages)[number];

/** Product facts stay beside the transcript throughout the illustrative conversation. */
export const ReplayScene = ({
  stage,
  copy,
  locale,
}: {
  stage: ReplayStage;
  copy: ReplayCopy;
  locale: string;
}) => {
  const fixed = stage === "fix" || stage === "rerun";
  const selected =
    stage === "pick" ? "rival" : stage === "rerun" ? "own" : undefined;
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: agentReplay.currency,
    maximumFractionDigits: 0,
  });
  const number = new Intl.NumberFormat(locale);
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
      className="grid min-w-0 grid-cols-2 gap-4 max-sm:gap-2"
    >
      {(["own", "rival"] as const).map((side) => (
        <article
          key={side}
          className={cn(
            "min-w-0 overflow-hidden rounded-lg border bg-background-rich text-foreground-rich",
            selected === side
              ? "border-primary-rich"
              : "border-background-rich/20",
          )}
          data-replay-product={side}
        >
          <div className="relative bg-background-rich">
            <CommerceFigure
              kind="officeChair"
              surface="rich"
              className="aspect-square [&>span]:hidden"
            />
          </div>
          <div className="px-4 pb-4 max-sm:px-3">
            <p className="flex min-h-10 items-center justify-between gap-2 text-foreground-dimmed text-xs">
              {copy.listing[side]}
              {selected === side && (
                <CheckIcon
                  aria-hidden
                  className="size-4 shrink-0 text-primary-text"
                />
              )}
            </p>
            <h4 className="min-h-14 font-heading text-base text-foreground-rich leading-snug">
              {side === "own" ? copy.listing.ownTitle : copy.listing.rivalTitle}
            </h4>
            <p className="mt-2 font-heading text-2xl text-foreground-rich">
              {currency.format(agentReplay[side].price)}
            </p>
            <dl className="mt-4 grid gap-4 border-accent-foreground border-t pt-4">
              {agentReplay.fields
                .filter((key) => key !== "price")
                .map((key) => {
                  const missing =
                    side === "own" &&
                    !fixed &&
                    agentReplay.missing.some((item) => item === key);
                  return (
                    <div key={key}>
                      <dt className="mb-1 text-foreground-dimmed text-xs">
                        {copy.fields[key]}
                      </dt>
                      <dd
                        className={cn(
                          "text-sm",
                          missing
                            ? "text-warning-foreground"
                            : "text-foreground-rich",
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
          </div>
        </article>
      ))}
    </div>
  );
};
