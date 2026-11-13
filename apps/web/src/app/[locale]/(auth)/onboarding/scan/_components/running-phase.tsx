"use client";

import { cn } from "@zenncore/utils";
import { Progress } from "@zenncore/web/components/progress";
import Image from "next/image";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import { formatElapsed } from "@/lib/date";

const models = [
  { model: "ChatGPT", logo: "/images/chatgpt.svg" },
  { model: "Claude", logo: "/images/claude.svg" },
  { model: "Gemini", logo: "/images/gemini.svg" },
] as const;

export namespace RunningPhase {
  export type Props = {
    simulations: number;
    progress: number;
    statuses: Record<string, "queued" | "running" | "complete">;
    modelStats: Record<string, { wins: number; losses: number }>;
    logs: Array<{
      id: number;
      model: string;
      message: string;
      elapsed: number;
    }>;
  };
}

export const RunningPhase = ({
  simulations,
  progress,
  statuses,
  modelStats,
  logs,
}: RunningPhase.Props) => {
  const translate = useTranslations("onboarding.scan");
  const experience = useTranslations("onboarding.experience");
  const format = useFormatter();
  const locale = useLocale();
  const logContainer = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);

  // Follow new events only while the reader is already near the bottom.
  // Scrolling this element never moves the page or a surrounding workspace.
  useEffect(() => {
    const container = logContainer.current;
    if (!container || !followLatest.current || logs.length === 0) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "instant" });
  }, [logs.length]);

  return (
    <Motion.Stagger
      key="running"
      stagger={0.04}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <Motion.Item className="relative shrink-0 border-accent-foreground border-b bg-linear-to-br from-primary/10 via-background-rich to-background-rich px-6 py-5 sm:px-8 sm:py-7">
        <h1 className="font-heading text-3xl text-foreground-rich tracking-tight sm:text-4xl">
          {translate("running.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-foreground-dimmed leading-relaxed">
          {translate("running.description")}
        </p>
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      </Motion.Item>

      <Motion.Item className="grid shrink-0 grid-cols-3 divide-x divide-accent-foreground border-accent-foreground border-b bg-linear-to-b from-background-rich to-primary/5">
        {models.map(({ model, logo }) => {
          const status = statuses[model] ?? "queued";
          const stats = modelStats[model];
          return (
            <div
              key={model}
              className="flex min-w-0 flex-col px-3 py-4 sm:px-6 sm:py-5"
            >
              <Image
                src={logo}
                alt=""
                width={32}
                height={32}
                className="mb-3 size-8 object-contain"
              />
              <h2 className="font-medium text-foreground-rich text-sm sm:text-base">
                {model}
              </h2>
              <p
                className={cn(
                  "mt-1 text-xs sm:text-sm",
                  status === "complete"
                    ? "text-success"
                    : status === "running"
                      ? "text-primary-text"
                      : "text-foreground-dimmed",
                )}
              >
                {status === "complete"
                  ? translate("running.status.done")
                  : status === "running"
                    ? translate("running.status.running")
                    : translate("running.status.queued")}
              </p>
              <dl className="mt-3 space-y-1 text-xs tabular-nums">
                <div className="flex flex-wrap justify-between gap-x-2">
                  <dt className="text-foreground-dimmed">
                    {experience("wins")}
                  </dt>
                  <dd className="text-success">
                    {format.number(stats?.wins ?? 0)}
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-x-2">
                  <dt className="text-foreground-dimmed">
                    {experience("losses")}
                  </dt>
                  <dd className="text-foreground">
                    {format.number(stats?.losses ?? 0)}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
      </Motion.Item>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background-rich">
        <div className="flex shrink-0 items-center justify-between gap-3 px-6 py-3 sm:px-8">
          <h2
            id="scan-live-log"
            className="font-medium text-foreground-rich text-sm"
          >
            {translate("running.liveScan")}
          </h2>
          <span className="text-primary-text text-sm tabular-nums">
            {format.number(Math.floor(progress))}%
          </span>
        </div>
        <Progress
          value={progress}
          aria-label={translate("running.liveScan")}
          className="shrink-0"
          classList={{ indicator: "motion-reduce:transition-none" }}
        />
        <div
          ref={logContainer}
          role="log"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: The log viewport must be keyboard-scrollable.
          tabIndex={0}
          aria-labelledby="scan-live-log"
          onScroll={(event) => {
            const container = event.currentTarget;
            followLatest.current =
              container.scrollHeight -
                container.scrollTop -
                container.clientHeight <
              64;
          }}
          className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-6 py-4 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset sm:px-8"
        >
          {logs.map((entry) => (
            <div
              key={entry.id}
              className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 text-sm"
            >
              <span className="shrink-0 font-mono text-foreground-dimmed text-xs tabular-nums">
                {formatElapsed(entry.elapsed, locale)}
              </span>
              <span className="shrink-0 font-medium text-primary-text">
                {entry.model}
              </span>
              <p className="wrap-anywhere min-w-0 flex-1 basis-48 text-foreground leading-relaxed">
                {entry.message}
              </p>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-foreground-dimmed text-sm">
              {translate("running.initializing")}
            </p>
          )}
        </div>
        <p className="shrink-0 border-accent-foreground border-t px-6 py-3 text-foreground-dimmed text-sm sm:px-8">
          {translate("running.progress", { count: format.number(simulations) })}
        </p>
      </div>
    </Motion.Stagger>
  );
};
