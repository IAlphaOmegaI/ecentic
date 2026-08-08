"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@zenncore/web/components/avatar";
import { ScrollArea } from "@zenncore/web/components/scroll-area";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { Spring } from "@/lib/animations";
import { formatPrice } from "@/lib/currency";
import type * as Competitor from "@/server/app/competitor";

export namespace CompetitorResults {
  export type Props = {
    competitors: Competitor.Type[];
    /** Singular noun for the footer count, e.g. "product" or "competitor". */
    noun: string;
    /** Past-tense verb for the footer count, e.g. "extracted" or "found". */
    verb: string;
    onClear: () => void;
  };
}

/**
 * Shared result list for the competitor tabs. UrlTab and SearchTab render the
 * exact same rows and footer, so the markup lives here to keep them identical.
 */
export const CompetitorResults = ({
  competitors,
  noun,
  verb,
  onClear,
}: CompetitorResults.Props) => (
  <>
    <ScrollArea className="min-h-0 flex-1 bg-background-rich">
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
            <Avatar className="size-10 shrink-0 rounded-none bg-primary/10">
              <AvatarImage
                src={competitor.image ?? "/images/fallback.png"}
                alt={competitor.title}
              />
              <AvatarFallback className="relative">
                <Image src="/images/fallback.png" alt="Fallback" fill />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground text-sm">
                {competitor.title}
              </p>
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
              {formatPrice(competitor.price, competitor.currency)}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </ScrollArea>

    <div className="flex items-center justify-between border-accent-foreground border-t bg-background-dimmed px-4 py-2.5">
      <span className="text-foreground-dimmed text-xs">
        {competitors.length} {noun}
        {competitors.length !== 1 ? "s" : ""} {verb}
      </span>
      <button
        type="button"
        onClick={onClear}
        className="text-foreground-dimmed text-xs transition-colors hover:text-foreground"
      >
        Clear
      </button>
    </div>
  </>
);
