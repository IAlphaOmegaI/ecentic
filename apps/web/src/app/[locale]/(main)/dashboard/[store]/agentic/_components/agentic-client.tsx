"use client";

import { readStreamableValue } from "@ai-sdk/rsc";
import {
  ClockIcon,
  GlobeIcon,
  RadarIcon,
  ShareIcon,
  TrendDownIcon,
  TrendUpIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { useRouter } from "next/navigation";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { scan as runScan } from "@/server/app/intelligence/agentic";
import {
  type CheckStatus,
  scoreTone,
} from "@/server/app/intelligence/agentic-contract";
import { StatusPill } from "../../../_components/grid";
import { CheckStatusMark } from "./marks";

type LogLine = {
  id: string;
  name: string;
  layer: string;
  status: CheckStatus;
};

/**
 * Runs a scan and narrates it. The finished report is written server-side, so
 * completion refreshes the route rather than re-rendering 124 checks here —
 * the stored report stays the single thing the page reads.
 */
export const ScanRunner = ({
  store,
  target,
  lastScannedAt,
  reportUrl,
}: {
  store: string;
  target: string;
  lastScannedAt: string | null;
  reportUrl: string | null;
}) => {
  const translate = useTranslations("dashboard.agentic");
  const format = useFormatter();
  const router = useRouter();

  const [lines, setLines] = useState<LogLine[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  // The scan streams 125 checks. Announcing each one would make the page
  // unusable with a screen reader, so only quarter marks are spoken.
  const milestoneRef = useRef(-1);

  // Only the log scrolls. `scrollIntoView` on a sentinel drags the page's own
  // scroller with it, which is wrong inside a dashboard band. Keyed on `lines`
  // because the container mounts only once the first line arrives — an empty
  // dependency list would run while the ref was still null and never again.
  // biome-ignore lint/correctness/useExhaustiveDependencies: new log entries drive the scroll
  useEffect(() => {
    const container = logRef.current;
    if (!container) return;

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [lines]);

  const setNoticeAndAnnounce = (message: string) => {
    setNotice(message);
    setAnnouncement(message);
  };

  const [handleScan, isScanning] = useAsyncAction(async () => {
    setLines([]);
    setTotal(null);
    setNotice(null);
    milestoneRef.current = -1;
    setPhase(translate("scan.starting"));
    setAnnouncement(translate("scan.starting"));

    const result = await runScan({ store });
    if (!result.success) {
      setPhase(null);
      setNotice(result.error.message);
      setAnnouncement(result.error.message);
      return;
    }

    for await (const event of readStreamableValue(result.data.output)) {
      if (!event) continue;

      switch (event.kind) {
        case "roster":
          setTotal(event.total);
          break;
        case "phase":
          setPhase(event.label);
          break;
        case "check": {
          setPhase(event.name);
          setLines((previous) => [
            ...previous,
            {
              id: event.id,
              name: event.name,
              layer: event.layer,
              status: event.status,
            },
          ]);

          const milestone = total
            ? Math.floor((event.completed / total) * 4)
            : -1;
          if (milestone > milestoneRef.current) {
            milestoneRef.current = milestone;
            setAnnouncement(
              translate("scan.announceProgress", {
                percent: String(milestone * 25),
              }),
            );
          }
          break;
        }
        case "summary":
          setPhase(event.summary);
          break;
        case "blocked":
          setPhase(null);
          setNoticeAndAnnounce(
            event.reason === "running"
              ? translate("scan.blocked.running")
              : translate("scan.blocked.cooldown", {
                  when: format.dateTime(new Date(event.availableAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                }),
          );
          break;
        case "report":
          setPhase(null);
          setAnnouncement(
            translate("scan.announceComplete", {
              score: String(Math.round(event.report.score)),
            }),
          );
          router.refresh();
          break;
        case "error":
          setPhase(null);
          setNoticeAndAnnounce(event.message);
          break;
      }
    }
  });

  return (
    <div className="flex flex-col">
      {/* Mounted from first render and initially empty — a live region inserted
          already-populated is announced unreliably or not at all. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6 sm:py-5">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <GlobeIcon
              aria-hidden
              className="mt-1 size-6 shrink-0 text-primary-text"
            />
            <div className="min-w-0">
              <h2 className="font-semibold text-base text-foreground-rich">
                {translate("scan.workspaceTitle")}
              </h2>
              <p className="mt-0.5 break-all text-foreground text-sm">
                {target}
              </p>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-foreground-dimmed text-xs">
            <ClockIcon aria-hidden className="size-3.5 shrink-0" />
            {lastScannedAt
              ? translate("scan.lastScanned", {
                  when: format.relativeTime(new Date(lastScannedAt)),
                })
              : translate("scan.awaitingFirst")}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <Button
            color="primary"
            onClick={handleScan}
            disabled={isScanning}
            className="w-full sm:w-auto"
          >
            <RadarIcon aria-hidden className="size-4" />
            {isScanning ? translate("scan.running") : translate("scan.action")}
          </Button>
          {reportUrl && (
            <Button
              color="neutral"
              variant="soft"
              className="w-full whitespace-normal sm:w-auto"
              render={
                <a href={reportUrl} target="_blank" rel="noopener noreferrer" />
              }
            >
              {translate("scan.report")}
              <ShareIcon aria-hidden className="size-4" />
            </Button>
          )}
        </div>
        <p className="text-foreground-dimmed text-xs leading-relaxed sm:col-span-2">
          {translate.rich("scan.providerNote", {
            provider: (label) => (
              <a
                href="https://is-agentic.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline decoration-accent-rich underline-offset-2 hover:text-primary-text"
              >
                {label}
              </a>
            ),
          })}
        </p>
      </div>

      {(isScanning || phase) && (
        <div className="flex flex-col gap-2 border-accent-foreground border-t p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate text-foreground text-sm">{phase}</p>
            {total !== null && (
              <p className="shrink-0 text-foreground-dimmed text-sm tabular-nums">
                {translate("scan.progress", {
                  done: String(lines.length),
                  total: String(total),
                })}
              </p>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-background-dimmed">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
              style={{
                width: total ? `${(lines.length / total) * 100}%` : "5%",
              }}
            />
          </div>
        </div>
      )}

      {lines.length > 0 && (
        <div
          ref={logRef}
          className="max-h-64 overflow-y-auto border-accent-foreground border-t"
        >
          <div className="divide-y divide-accent-foreground">
            {lines.map((line) => (
              <div
                key={line.id}
                className="flex items-center gap-3 px-4 py-2 text-sm"
              >
                <CheckStatusMark
                  status={line.status}
                  label={translate(`checkStatus.${line.status}`)}
                  compact
                />
                <span className="min-w-0 truncate text-foreground">
                  {line.name}
                </span>
                <span className="ml-auto shrink-0 text-foreground-dimmed">
                  {line.layer}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {notice && (
        <p className="border-accent-foreground border-t p-4 text-foreground text-sm">
          {notice}
        </p>
      )}
    </div>
  );
};

/** Score across stored scans. */
export const ScoreTrend = ({
  history,
}: {
  history: { score: number; scannedAt: string }[];
}) => {
  const translate = useTranslations("dashboard.agentic");
  const format = useFormatter();

  const [first] = history;
  const latest = history.at(-1);

  // Two points are the minimum that can show a direction; one states a trend
  // that has not been measured.
  if (history.length < 2 || !first || !latest) return null;

  return (
    <div className="flex flex-col gap-3 border-accent-foreground border-t p-4">
      <div className="flex items-center gap-2">
        <TrendUpIcon
          aria-hidden
          className="size-4 shrink-0 text-foreground-dimmed"
        />
        <p className="font-medium text-foreground text-sm">
          {translate("score.trend")}
        </p>
      </div>
      {/* The line is decorative on its own — the reading of it is the content. */}
      <p className="text-foreground-dimmed text-sm">
        {translate("score.trendSummary", {
          count: String(history.length),
          first: String(first.score),
          latest: String(latest.score),
          since: format.dateTime(new Date(first.scannedAt), {
            dateStyle: "medium",
          }),
        })}
      </p>
      <div className="h-24 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={history}
            margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="agenticTrend" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0.25}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <XAxis dataKey="scannedAt" hide />
            <YAxis domain={[0, 100]} hide />
            <Tooltip
              cursor={{
                stroke: "var(--color-foreground-dimmed)",
                strokeOpacity: 0.35,
              }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;

                return (
                  <div className="rounded-sm border border-accent-foreground bg-background-rich px-3 py-2 shadow-sm">
                    <p className="text-foreground-dimmed text-xs">
                      {format.dateTime(new Date(String(label)), {
                        dateStyle: "medium",
                      })}
                    </p>
                    <p className="font-medium text-foreground text-sm tabular-nums">
                      {payload[0]?.value} / 100
                    </p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#agenticTrend)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/**
 * One competitor storefront, with its last score and a button to rescan it.
 * Each domain carries its own cooldown server-side, so scanning a rival never
 * consumes the merchant's own scan.
 */
const CompetitorRow = ({
  store,
  target,
  score,
  scannedAt,
  ownScore,
}: {
  store: string;
  target: string;
  score: number | null;
  scannedAt: string | null;
  ownScore: number | null;
}) => {
  const translate = useTranslations("dashboard.agentic");
  const format = useFormatter();
  const now = useNow();
  const router = useRouter();

  const [progress, setProgress] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [handleScan, isScanning] = useAsyncAction(async () => {
    setNotice(null);
    setProgress(translate("scan.starting"));

    const result = await runScan({ store, target });
    if (!result.success) {
      setProgress(null);
      setNotice(result.error.message);
      return;
    }

    for await (const event of readStreamableValue(result.data.output)) {
      if (!event) continue;

      switch (event.kind) {
        case "check":
          setProgress(event.name);
          break;
        case "blocked":
          setProgress(null);
          setNotice(
            event.reason === "running"
              ? translate("scan.blocked.running")
              : translate("scan.blocked.cooldown", {
                  when: format.dateTime(new Date(event.availableAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                }),
          );
          break;
        case "report":
          setProgress(null);
          router.refresh();
          break;
        case "error":
          setProgress(null);
          setNotice(event.message);
          break;
      }
    }
  });

  // Only meaningful once both sides have a score; a gap against nothing is not
  // a gap.
  const delta = score !== null && ownScore !== null ? ownScore - score : null;

  const scanned = (() => {
    if (progress) return progress;
    if (notice) return notice;
    if (scannedAt) return format.relativeTime(new Date(scannedAt), now);
    return translate("competitors.never");
  })();

  return (
    <TableRow className="hover:bg-background-dimmed/40">
      <TableCell className="max-w-0 font-medium">
        <div className="flex min-w-0 items-center gap-2">
          <GlobeIcon
            aria-hidden
            className="size-4 shrink-0 text-foreground-dimmed"
          />
          <span className="min-w-0 truncate">{target}</span>
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap text-foreground-dimmed">
        {scanned}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {score === null ? (
          <StatusPill className="normal-case tracking-normal">
            {translate("competitors.unscored")}
          </StatusPill>
        ) : (
          <p
            className={cn(
              "font-semibold tabular-nums",
              {
                success: "text-success",
                warning: "text-warning",
                error: "text-error",
              }[scoreTone(score)],
            )}
          >
            {score}
            <span className="ml-0.5 font-medium text-foreground-dimmed">
              /100
            </span>
          </p>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {delta !== null && delta !== 0 ? (
          <StatusPill
            tone={delta > 0 ? "success" : "error"}
            className="normal-case tracking-normal"
          >
            {delta > 0 ? (
              <TrendUpIcon aria-hidden className="size-3" />
            ) : (
              <TrendDownIcon aria-hidden className="size-3" />
            )}
            {translate(delta > 0 ? "competitors.ahead" : "competitors.behind", {
              points: String(Math.abs(delta)),
            })}
          </StatusPill>
        ) : (
          <span className="text-foreground-dimmed">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button
          color="neutral"
          variant="soft"
          onClick={handleScan}
          disabled={isScanning}
          className="shrink-0"
        >
          {isScanning
            ? translate("scan.running")
            : translate("competitors.action")}
        </Button>
      </TableCell>
    </TableRow>
  );
};

export const CompetitorScans = ({
  store,
  ownScore,
  rows,
}: {
  store: string;
  ownScore: number | null;
  rows: {
    target: string;
    score: number | null;
    scannedAt: string | null;
  }[];
}) => {
  const translate = useTranslations("dashboard.agentic");
  const formatter = useFormatter();
  const scored = rows.filter((row) => row.score !== null).length;
  const coverage =
    rows.length === 0 ? 0 : Math.round((scored / rows.length) * 100);

  return (
    <div className="min-w-0">
      <div className="min-w-0 overflow-hidden bg-background-rich">
        <div className="flex items-center gap-4 border-accent-foreground border-b px-4 py-6 sm:px-6">
          <p className="font-semibold text-3xl text-foreground-rich tabular-nums">
            {formatter.number(coverage / 100, {
              style: "percent",
              maximumFractionDigits: 0,
            })}
          </p>
          <div>
            <p className="font-medium text-base text-foreground">
              {translate("competitors.coverage", {
                scored: String(scored),
                total: String(rows.length),
              })}
            </p>
            <div className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-accent-foreground">
              <div
                className="h-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
                style={{ width: `${coverage}%` }}
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-176 table-fixed border-b-0">
            <TableHeader>
              <TableRow>
                <TableHead className="w-auto font-medium text-foreground-dimmed text-xs normal-case tracking-normal">
                  {translate("competitors.columnStorefront")}
                </TableHead>
                <TableHead className="w-48 font-medium text-foreground-dimmed text-xs normal-case tracking-normal">
                  {translate("competitors.columnScanned")}
                </TableHead>
                <TableHead className="w-28 font-medium text-foreground-dimmed text-xs normal-case tracking-normal">
                  {translate("competitors.columnScore")}
                </TableHead>
                <TableHead className="w-36 font-medium text-foreground-dimmed text-xs normal-case tracking-normal">
                  {translate("competitors.columnGap")}
                </TableHead>
                <TableHead className="w-28 normal-case tracking-normal">
                  <span className="sr-only">
                    {translate("competitors.action")}
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <CompetitorRow
                  key={row.target}
                  store={store}
                  target={row.target}
                  score={row.score}
                  scannedAt={row.scannedAt}
                  ownScore={ownScore}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
