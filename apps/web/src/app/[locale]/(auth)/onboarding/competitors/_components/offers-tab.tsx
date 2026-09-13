"use client";

import { readStreamableValue } from "@ai-sdk/rsc";
import { ShoppingCartIcon } from "@zenncore/icons";
import { cn, resultify, unwrapResult } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { formatElapsed } from "@/lib/date";
import type * as Competitor from "@/server/app/competitor";
import * as Offers from "@/server/app/intelligence/offers";

type LogEntry = {
  id: number;
  text: string;
  /** Milliseconds from run start when this line arrived — frozen, never ticks. */
  arrivedAt: number;
  type: "info" | "success" | "error";
};

/** Isolated from the header timer so per-line stamps stay frozen while elapsed ticks. */
const DiscoveryLogLines = ({
  logs,
  active,
}: {
  logs: LogEntry[];
  active: boolean;
}) => (
  <>
    {logs.map((log, index) => {
      const age = logs.length - 1 - index;
      const opacity = active ? Math.max(0.2, 1 - age * 0.1) : 1;
      return (
        <motion.div
          key={log.id}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity, x: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex items-baseline gap-2"
        >
          <span className="shrink-0 font-mono text-foreground-dimmed/50 tabular-nums">
            {formatElapsed(log.arrivedAt)}
          </span>
          <span
            className={
              log.type === "error"
                ? "text-error leading-relaxed"
                : log.type === "success"
                  ? "font-medium text-success leading-relaxed"
                  : "text-foreground-dimmed leading-relaxed"
            }
          >
            {log.text}
          </span>
        </motion.div>
      );
    })}
  </>
);

export namespace OffersTab {
  export type Props = {
    products: string[];
    onSuccess?: (competitors: Competitor.Type[]) => void;
    store: string;
    className?: string;
  };
}

/**
 * Measured competitor discovery: who else actually sells each of the merchant's
 * products, and at what price.
 *
 * The distinction from the sibling tabs is the whole point of the tab. The
 * others ask a model who a rival might be — a recollection, with a price the
 * model invented. This asks a shopping index which sellers carry this exact
 * product right now, and stores what it answers. So the log reports per
 * PRODUCT, not per rival: "no one else sells this" is a real, useful finding
 * for a private-label merchant, and hiding it behind an empty list would read
 * as a failure instead.
 */
export const OffersTab = ({
  products,
  onSuccess,
  store,
  className,
}: OffersTab.Props) => {
  const toast = useToastManager();
  const router = useRouter();
  const translate = useTranslations("onboarding.competitors.offers");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);

  const start = useRef<number>(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = (entry: Omit<LogEntry, "id" | "arrivedAt">) =>
    setLogs((previous) => [
      ...previous,
      {
        ...entry,
        id: previous.length + 1,
        arrivedAt: Date.now() - start.current,
      },
    ]);

  useEffect(() => {
    if (logs.length === 0) return;

    const container = logRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    });
  }, [logs]);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const [handleDiscover, isDiscovering] = useAsyncAction(async () => {
    setLogs([]);
    setElapsed(0);
    start.current = Date.now();

    timer.current = setInterval(() => {
      setElapsed(Date.now() - start.current);
    }, 100);

    const discovery = await resultify(async () => {
      const { output } = await unwrapResult(
        Offers.streamOfferDiscovery({ products, store }),
      );

      const collected: Competitor.Type[] = [];

      for await (const event of readStreamableValue(output)) {
        if (!event) continue;

        switch (event.kind) {
          case "status":
            addLog({ text: event.message, type: "info" });
            break;
          case "competitor":
            collected.push(event.competitor);
            addLog({
              text: translate("sellerLog", {
                seller: event.competitor.source ?? event.competitor.title,
                price: event.competitor.price ?? "—",
              }),
              type: "success",
            });
            break;
          case "product":
            // A product nobody else sells is a finding, not a gap — say so
            // rather than leaving a silent hole in the log. Category peers are
            // a successful fallback when the exact SKU has no other sellers.
            if (event.offers === 0) {
              addLog({
                text:
                  event.reason === "budget-exhausted"
                    ? translate("budgetLog")
                    : translate("exclusiveLog", { title: event.title }),
                type: "info",
              });
              break;
            }
            if (event.match === "category") {
              addLog({
                text: translate("categoryLog", {
                  title: event.title,
                  count: event.offers,
                }),
                type: "success",
              });
            }
            break;
          case "done":
            // Per-product outcomes are already in the log; the totals here add
            // nothing the merchant has not just watched arrive.
            break;
          case "error":
            throw new Error(event.message);
        }
      }

      return collected;
    });

    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }

    if (!discovery.success) {
      addLog({ text: translate("errors.failed"), type: "error" });
      toast.add({
        title: translate("toast.failed"),
        description: discovery.error.message,
        type: "error",
      });
      return;
    }

    if (discovery.data.length === 0) {
      addLog({ text: translate("errors.noneFound"), type: "error" });
      toast.add({
        title: translate("toast.noneFound.title"),
        description: translate("toast.noneFound.description"),
        type: "error",
      });
      return;
    }

    addLog({
      text: translate("measured", { count: discovery.data.length }),
      type: "success",
    });
    router.refresh();
    onSuccess?.(discovery.data);
    toast.add({
      title: translate("toast.found.title"),
      description: translate("toast.found.description", {
        count: discovery.data.length,
      }),
      type: "success",
    });
  });

  return (
    <div className={cn("relative flex h-full bg-background-dimmed", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {!isDiscovering && logs.length === 0 && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="m-auto flex size-full flex-1 flex-col items-center justify-center p-4"
          >
            <div className="relative z-20 max-w-md">
              <h3 className="text-center font-medium text-2xl text-foreground">
                {translate("title")}
              </h3>
              <p className="mt-1 text-center text-foreground-dimmed text-lg">
                {translate("description")}
              </p>
            </div>
            <Button
              color="primary"
              type="button"
              onClick={handleDiscover}
              disabled={products.length === 0}
              className="relative z-20 mt-4"
            >
              {translate("action")} <ShoppingCartIcon />
            </Button>
          </motion.div>
        )}

        {(isDiscovering || logs.length > 0) && (
          <motion.div
            key="measuring"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-full max-h-full min-h-0 flex-1 flex-col"
          >
            <div
              className={cn(
                "flex items-center justify-between p-4",
                !isDiscovering && "border-accent-foreground border-b",
              )}
            >
              <div className="flex items-center gap-2">
                {isDiscovering && (
                  <motion.span
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{
                      duration: 1.4,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                    className="inline-block size-1.5 rounded-full bg-primary"
                  />
                )}
                <span className="font-medium text-foreground uppercase tracking-widest">
                  {isDiscovering
                    ? translate("measuring")
                    : translate("complete")}
                </span>
              </div>
              <span className="font-mono text-foreground-dimmed tabular-nums">
                {formatElapsed(elapsed)}
              </span>
            </div>

            {isDiscovering && (
              <div className="relative h-0.5 w-full overflow-hidden bg-primary/20">
                <motion.div
                  className="absolute h-full w-1/3 bg-primary"
                  animate={{ x: ["-100%", "400%"] }}
                  transition={{
                    duration: 1.6,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                />
              </div>
            )}

            <div
              ref={logRef}
              className="min-h-0 flex-1 space-y-1 overflow-y-auto scroll-smooth p-4"
            >
              <DiscoveryLogLines logs={logs} active={isDiscovering} />
            </div>

            {isDiscovering ? (
              <div className="flex items-center gap-1.5 border-accent-foreground border-t px-5 py-3">
                {[0, 0.2, 0.4].map((delay) => (
                  <motion.span
                    key={delay}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{
                      duration: 1,
                      repeat: Number.POSITIVE_INFINITY,
                      delay,
                      ease: "easeInOut",
                    }}
                    className="inline-block size-1 rounded-full bg-primary"
                  />
                ))}
                <span className="ml-1.5 font-light text-foreground-dimmed">
                  {translate("checking")}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between border-accent-foreground border-t p-4">
                <span className="font-light text-foreground-dimmed">
                  {translate("finishedIn", { elapsed: formatElapsed(elapsed) })}
                </span>
                <Button onClick={handleDiscover} color="accent">
                  {translate("runAgain")}
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
