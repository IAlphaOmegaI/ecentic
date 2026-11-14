"use client";

import { cn } from "@zenncore/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@zenncore/web/components/avatar";
import { Button } from "@zenncore/web/components/button";
import { ScrollArea } from "@zenncore/web/components/scroll-area";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Spring } from "@/lib/animations";
import {
  isMeasuredCompetitor,
  isVerifiedCompetitor,
} from "@/lib/competitor-source";
import { formatPrice, normalizePrice } from "@/lib/currency";
import type * as Competitor from "@/server/app/competitor";

export namespace CompetitorResults {
  export type Props = {
    competitors: Competitor.Type[];
    noun: "competitor" | "product";
    verb: "found" | "extracted";
    onClear: () => void;
    dashboard?: boolean;
  };
}

export const CompetitorResults = ({
  competitors,
  noun,
  verb,
  onClear,
  dashboard = false,
}: CompetitorResults.Props) => {
  const translate = useTranslations("onboarding.competitors.results");

  return (
    <>
      <ScrollArea
        className={cn(
          "min-h-0 flex-1 bg-background-rich",
          dashboard && "h-80 flex-none",
        )}
        viewportProps={{
          role: "region",
          tabIndex: 0,
          "aria-label": translate(
            noun === "competitor"
              ? "countCompetitorFound"
              : "countProductExtracted",
            { count: competitors.length },
          ),
        }}
      >
        <AnimatePresence initial={false}>
          {competitors.map((competitor) => (
            <motion.div
              key={competitor.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={Spring.Snappy}
              className="flex items-start gap-3 border-accent-foreground border-b p-3 transition-colors last:border-b-0 hover:bg-background-dimmed/40"
            >
              <Avatar className="size-10 shrink-0 rounded-lg bg-primary/10">
                <AvatarImage
                  src={competitor.image ?? "/images/fallback.png"}
                  alt={competitor.title}
                />
                <AvatarFallback className="relative">
                  <Image src="/images/fallback.png" alt="" fill />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-medium text-foreground text-sm">
                    {competitor.title}
                  </p>
                  {/* Provenance, which is the distinction a merchant is owed
                      here: a verified row's price was observed from a named
                      seller, a Google row is a rival observed on the same
                      result pages, and everything else is a model's guess.
                      Only one chip shows — the strongest claim that holds. */}
                  {(() => {
                    switch (true) {
                      case isVerifiedCompetitor(competitor.confidence):
                        return (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
                            {translate("verified")}
                          </span>
                        );
                      case isMeasuredCompetitor(competitor.source):
                        return (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
                            {translate("measured")}
                          </span>
                        );
                      default:
                        return null;
                    }
                  })()}
                </div>
                <p className="text-foreground-dimmed text-xs">
                  {[competitor.brand, competitor.source]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {competitor.description && (
                  <p className="mt-0.5 line-clamp-2 text-foreground-dimmed text-xs">
                    {competitor.description}
                  </p>
                )}
              </div>
              <p className="shrink-0 font-medium text-primary text-sm tabular-nums">
                {!isVerifiedCompetitor(competitor.confidence) ||
                !competitor.price
                  ? "—"
                  : competitor.currency
                    ? formatPrice(competitor.price, competitor.currency)
                    : normalizePrice(competitor.price)}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </ScrollArea>

      <div className="flex items-center justify-between border-accent-foreground border-t bg-background-dimmed px-4 py-2.5">
        <span className="text-foreground-dimmed text-xs">
          {noun === "competitor" && verb === "found"
            ? translate("countCompetitorFound", { count: competitors.length })
            : translate("countProductExtracted", { count: competitors.length })}
        </span>
        <Button
          variant="soft"
          color="neutral"
          type="button"
          onClick={onClear}
          className="text-foreground-dimmed text-xs transition-colors hover:text-foreground"
        >
          {translate("clear")}
        </Button>
      </div>
    </>
  );
};

// Shared by both manual tabs: an inline reason for a failed extraction/search.
// The toast that accompanies it disappears; this stays next to the input the
// user is about to retry with.
export const ErrorNotice = ({
  title,
  message,
}: {
  title: string;
  message: string;
}) => (
  <div className="border border-error/30 bg-error/5 px-3 py-2">
    <p className="font-medium text-error text-xs">{title}</p>
    <p className="mt-0.5 text-error/80 text-xs">{message}</p>
  </div>
);
