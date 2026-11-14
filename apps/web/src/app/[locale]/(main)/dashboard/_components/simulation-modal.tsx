"use client";

import { XIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  Dialog,
  DialogClose,
  DialogPopup,
  DialogTitle,
} from "@zenncore/web/components/dialog";
import { Progress } from "@zenncore/web/components/progress";
import { ScrollArea } from "@zenncore/web/components/scroll-area";
import { useToastManager } from "@zenncore/web/components/toast";
import Image from "next/image";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useScanRunner } from "@/app/[locale]/(auth)/onboarding/scan/_components/use-scan-runner";
import { Link } from "@/i18n/navigation";
import { formatElapsed } from "@/lib/date";
import { countForCurrentUser } from "@/server/app/competitor";
import type * as Simulate from "@/server/app/intelligence/simulate";
import { StatusPill, TopFindingCallout } from "./grid";

const providers = [
  {
    id: "gpt4",
    model: "ChatGPT",
    logo: "/images/chatgpt.svg",
    textColor: "text-primary",
    bgColor: "bg-primary",
  },
  {
    id: "claude",
    model: "Claude",
    logo: "/images/claude.svg",
    textColor: "text-warning",
    bgColor: "bg-warning",
  },
  {
    id: "gemini",
    model: "Gemini",
    logo: "/images/gemini.svg",
    textColor: "text-success",
    bgColor: "bg-success",
  },
] as const;

const modelColors: Record<string, string> = Object.fromEntries(
  providers.map((provider) => [provider.model, provider.textColor]),
);

export namespace SimulationModal {
  export type Props = {
    store: string;
    open: boolean;
    onClose: () => void;
  };
}

export const SimulationModal = ({
  store,
  open,
  onClose,
}: SimulationModal.Props) => {
  const locale = useLocale();

  const toast = useToastManager();
  const translate = useTranslations("dashboard.simulation");
  const general = useTranslations("general");
  const target = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    phase,
    stats,
    logs,
    statuses,
    winRates,
    topFinding,
    count,
    elapsed,
    handleRun,
    isRunning,
    reset,
  } = useScanRunner({
    store,
    onError: (text) => {
      setError(text);
      toast.add({
        title: translate("toast.failed.title"),
        description: text,
        type: "error",
      });
    },
  });

  const [start, isStarting] = useAsyncAction(async () => {
    setError(null);
    await handleRun();
  }, false);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();

    void (async () => {
      const result = await countForCurrentUser({ store });
      if (controller.signal.aborted || !result.success) return;
      if (result.data.total === 0) {
        setError(translate("pre.noCompetitors"));
      }
    })();

    return () => controller.abort();
  }, [open, store, translate]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to bottom on new log
  useEffect(() => {
    const viewport = target.current;
    viewport?.scrollTo({ top: viewport.scrollHeight, behavior: "instant" });
  }, [logs]);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setError(null);
      reset();
    }, 300);
  };

  const closable = !isRunning && !isStarting;
  const needsCompetitors = Boolean(error?.toLowerCase().includes("competitor"));

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && closable) handleClose();
      }}
    >
      <DialogPopup
        className={cn(
          "z-50 mt-0 flex w-11/12 max-w-5xl flex-col overflow-hidden bg-background-rich p-0 shadow-sm",
          phase === "pre" ? "max-h-dvh" : "h-160 max-h-dvh",
        )}
        classList={{ backdrop: "z-50 bg-foreground/40" }}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-accent-foreground border-b px-4 py-4 sm:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <DialogTitle className="m-0 font-semibold text-foreground-rich text-lg">
              {translate(`title.${phase}`)}
            </DialogTitle>
            {phase !== "pre" && (
              <StatusPill tone={phase === "complete" ? "success" : "primary"}>
                {translate(
                  phase === "complete" ? "states.done" : "states.live",
                )}
              </StatusPill>
            )}
          </div>
          {closable && (
            <DialogClose
              aria-label={general("dismiss.label")}
              className="size-8 shrink-0 border-0 bg-transparent p-0 text-foreground-dimmed"
            >
              <XIcon aria-hidden className="size-4" />
            </DialogClose>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {phase === "pre" && (
            <ScrollArea className="min-h-0 flex-1">
              <div className="px-4 py-6 sm:px-6">
                <h2 className="font-semibold text-foreground-rich text-xl">
                  {translate("pre.heading")}
                </h2>
                <p className="mt-2 max-w-2xl text-foreground-dimmed text-sm leading-6">
                  {translate("pre.description")}
                </p>
              </div>
              <div className="grid gap-px border-accent-foreground border-y bg-accent-foreground sm:grid-cols-3">
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-start gap-3 bg-background-rich px-4 py-5 sm:px-6"
                  >
                    <Image
                      src={provider.logo}
                      alt=""
                      width={28}
                      height={28}
                      className="size-7 shrink-0"
                    />
                    <div>
                      <p className="font-medium text-foreground-rich text-sm">
                        {provider.model}
                      </p>
                      <p className="mt-1 text-foreground-dimmed text-xs leading-5">
                        {translate(`providers.${provider.id}.description`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-start gap-4 px-4 py-5 sm:px-6">
                {error && (
                  <p role="alert" className="text-error text-sm leading-6">
                    {error}
                  </p>
                )}
                {needsCompetitors ? (
                  <Button
                    render={
                      <Link href={`/dashboard/${store}/competitors/add`} />
                    }
                  >
                    {translate("pre.addCompetitors")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => start()}
                    disabled={isRunning || isStarting}
                  >
                    {isStarting
                      ? general("states.pending.primary")
                      : translate("action.primary")}
                  </Button>
                )}
              </div>
            </ScrollArea>
          )}

          {phase === "running" && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="shrink-0 space-y-3 border-accent-foreground border-b px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground-rich text-sm">
                    {translate("running.heading")}
                  </p>
                  <p className="text-foreground-dimmed text-xs tabular-nums">
                    {formatElapsed(elapsed, locale)} · {stats.progress}%
                  </p>
                </div>
                <Progress
                  aria-label={translate("running.heading")}
                  value={stats.progress}
                />
              </div>
              <div className="grid shrink-0 gap-px border-accent-foreground border-b bg-accent-foreground sm:grid-cols-3">
                {providers.map((provider) => {
                  const status = statuses[provider.model];
                  return (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between gap-3 bg-background-rich px-4 py-3 sm:px-6"
                    >
                      <span className="flex items-center gap-2">
                        <Image
                          src={provider.logo}
                          alt=""
                          width={24}
                          height={24}
                          className="size-6"
                        />
                        <span className="font-medium text-sm">
                          {provider.model}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          status === "complete"
                            ? "text-success"
                            : "text-foreground-dimmed",
                        )}
                      >
                        {translate(
                          status === "complete"
                            ? "states.done"
                            : status === "running"
                              ? "states.running"
                              : "states.queued",
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              <ScrollArea
                className="min-h-0 flex-1"
                viewportProps={{
                  ref: target,
                  role: "region",
                  tabIndex: 0,
                  "aria-label": translate("running.heading"),
                }}
              >
                <div className="space-y-3 px-4 py-4 sm:px-6">
                  {logs.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-baseline gap-3 text-xs leading-5"
                    >
                      <span className="shrink-0 text-foreground-dimmed tabular-nums">
                        {formatElapsed(entry.elapsed, locale)}
                      </span>
                      <div className="min-w-0">
                        <span
                          className={cn(
                            "font-medium",
                            modelColors[entry.model] ??
                              "text-foreground-dimmed",
                          )}
                        >
                          {entry.model}
                        </span>
                        <p className="wrap-anywhere mt-0.5 text-foreground">
                          {entry.message}
                        </p>
                      </div>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <p className="text-foreground-dimmed text-sm">
                      {translate("states.initializing")}
                    </p>
                  )}
                </div>
              </ScrollArea>
              <p
                role="status"
                className="shrink-0 border-accent-foreground border-t px-4 py-3 text-foreground-dimmed text-xs sm:px-6"
              >
                {translate("running.comparisons", {
                  count: String(stats.wins + stats.losses),
                })}
              </p>
            </div>
          )}

          {phase === "complete" && (
            <ScrollArea className="min-h-0 flex-1">
              <CompletePhaseModal
                wins={stats.wins}
                losses={stats.losses}
                winRates={winRates}
                topFinding={topFinding}
                products={count}
                elapsed={elapsed}
                onClose={handleClose}
                onRunAgain={reset}
              />
            </ScrollArea>
          )}
        </div>
      </DialogPopup>
    </Dialog>
  );
};

type CompletePhaseModalProps = {
  wins: number;
  losses: number;
  winRates: Record<string, { wins: number; losses: number; rate: number }>;
  topFinding: Simulate.TopFinding | null;
  products: number;
  elapsed: number;
  onClose: () => void;
  onRunAgain: () => void;
};

const CompletePhaseModal = ({
  wins,
  losses,
  winRates,
  topFinding,
  products,
  elapsed,
  onClose,
  onRunAgain,
}: CompletePhaseModalProps) => {
  const locale = useLocale();
  const format = useFormatter();
  const translate = useTranslations("dashboard.simulation");
  const research = useTranslations("dashboard.research.comparisons");
  const winRate =
    wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null;
  const resultColor =
    winRate === null
      ? "text-foreground-dimmed"
      : winRate < 30
        ? "text-error"
        : winRate < 60
          ? "text-warning"
          : "text-success";

  return (
    <div className="flex min-w-0 flex-col">
      <div className="grid border-accent-foreground border-b sm:grid-cols-2">
        <div className="px-4 py-6 sm:px-6">
          <p className="text-foreground-dimmed text-sm">
            {translate("complete.overallWinRate")}
          </p>
          <p
            className={cn(
              "mt-3 font-semibold text-5xl tabular-nums tracking-tight",
              resultColor,
            )}
          >
            {winRate === null
              ? "—"
              : format.number(winRate / 100, {
                  style: "percent",
                  maximumFractionDigits: 0,
                })}
          </p>
          <p className="mt-3 text-foreground-dimmed text-sm leading-6">
            {winRate === null
              ? research("unmeasured")
              : translate(
                  winRate < 30
                    ? "complete.results.low"
                    : winRate < 60
                      ? "complete.results.medium"
                      : "complete.results.high",
                )}
          </p>
          <p className="mt-2 text-foreground-dimmed text-xs">
            {translate("complete.completedIn", {
              elapsed: formatElapsed(elapsed, locale),
            })}
          </p>
        </div>
        <div className="divide-y divide-accent-foreground border-accent-foreground border-t sm:border-t-0 sm:border-l">
          {(
            [
              { key: "wins", value: wins },
              { key: "losses", value: losses },
              { key: "products", value: products },
            ] as const
          ).map((stat) => (
            <div
              key={stat.key}
              className="flex items-center justify-between gap-4 px-4 py-5 sm:px-6"
            >
              <p className="text-foreground-dimmed text-sm">
                {translate(`complete.stats.${stat.key}`)}
              </p>
              <p className="font-semibold text-2xl text-foreground-rich tabular-nums">
                {format.number(stat.value)}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="border-accent-foreground border-b px-4 py-4 sm:px-6">
        <h3 className="font-semibold text-base text-foreground-rich">
          {translate("complete.winRateByModel")}
        </h3>
      </div>
      <div className="divide-y divide-accent-foreground">
        {providers.map((provider) => {
          const rates = winRates[provider.id];
          const hasSample =
            rates !== undefined && rates.wins + rates.losses > 0;
          return (
            <div
              key={provider.id}
              className="flex items-center gap-3 px-4 py-4 sm:px-6"
            >
              <Image
                src={provider.logo}
                alt=""
                width={28}
                height={28}
                className="size-7 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground-rich text-sm">
                  {provider.model}
                </p>
                <p className="mt-1 text-foreground-dimmed text-xs">
                  {hasSample
                    ? `${format.number(rates.wins)} ${translate("complete.stats.wins")} · ${format.number(rates.losses)} ${translate("complete.stats.losses")}`
                    : research("unmeasured")}
                </p>
              </div>
              <p className="font-semibold text-xl tabular-nums">
                {hasSample
                  ? format.number(rates.rate / 100, {
                      style: "percent",
                      maximumFractionDigits: 0,
                    })
                  : "—"}
              </p>
            </div>
          );
        })}
      </div>
      {topFinding && (
        <TopFindingCallout className="border-accent-foreground border-t px-4 py-5 sm:px-6">
          {translate("complete.topFinding", {
            name: topFinding.name,
            attributes: format.list(topFinding.missingAttributes, {
              type: "conjunction",
            }),
            impact: topFinding.impactDescription,
            lossPercentage: format.number(topFinding.lossPercentage),
          })}
        </TopFindingCallout>
      )}
      <div className="flex flex-wrap items-center gap-3 border-accent-foreground border-t px-4 py-5 sm:px-6">
        <Button onClick={onClose}>{translate("action.tertiary")}</Button>
        <Button variant="soft" color="neutral" onClick={onRunAgain}>
          {translate("action.secondary")}
        </Button>
      </div>
    </div>
  );
};
