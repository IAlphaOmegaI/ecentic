"use client";

import {
  AwardIcon,
  BullseyeIcon,
  ClockIcon,
  RadarIcon,
  ShoppingCartIcon,
  TrendDownIcon,
  TrendUpIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { Checkbox } from "@zenncore/web/components/checkbox";
import { Progress } from "@zenncore/web/components/progress";
import { useToastManager } from "@zenncore/web/components/toast";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { AutoDetectTab } from "@/app/[locale]/(auth)/onboarding/competitors/_components/auto-detect-tab";
import { useScanRunner } from "@/app/[locale]/(auth)/onboarding/scan/_components/use-scan-runner";
import { formatScanEstimate } from "@/lib/scan-estimate";
import type * as Competitor from "@/server/app/competitor";
import type * as Simulate from "@/server/app/intelligence/simulate";
import type * as Product from "@/server/app/product";
import {
  Crosshair,
  SectionGutter,
  SectionKicker,
  StatLabel,
  StatusPill,
  TopFindingCallout,
} from "../../../_components/grid";

const models = [
  { id: "gpt4", label: "ChatGPT", logo: "/images/chatgpt.svg" },
  { id: "claude", label: "Claude", logo: "/images/claude.svg" },
  { id: "gemini", label: "Gemini", logo: "/images/gemini.svg" },
] as const;

const modelColors: Record<string, string> = {
  ChatGPT: "text-primary",
  Claude: "text-warning",
  Gemini: "text-success",
  System: "text-foreground-dimmed",
};

const formatElapsed = (ms: number) => {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
};

type LastScan = {
  id: string;
  wins: number;
  losses: number;
  topFinding: Simulate.TopFinding | null;
  modelRates: Record<string, { wins: number; losses: number; rate: number }>;
};

export namespace SimulationsClient {
  export type Props = {
    store: string;
    /** 10-row preview ids feeding the detection tab, not the scan roster. */
    productIds: string[];
    products: Product.Candidate[];
    competitors: Competitor.Candidate[];
    lastScan: LastScan | null;
  };
}

/**
 * The canonical grid cell used by the Discovery band: StatLabel (icon pinned
 * top-right) over a big tabular value + caption. Sharp, no per-cell border —
 * the surrounding `gap-px` over `bg-accent-foreground` is the seam. design.md §3.1
 */
const StatCell = ({
  label,
  icon,
  value,
  caption,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  caption: string;
}) => (
  <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
    <StatLabel label={label} icon={icon} />
    <div>
      <p className="font-bold text-4xl text-foreground-rich capitalize tabular-nums tracking-[-0.02em]">
        {value}
      </p>
      <p className="mt-3 text-foreground-dimmed text-xs">{caption}</p>
    </div>
  </div>
);

type RosterEntry = {
  id: string;
  title: string;
  subtitle: string | null;
  image: string | null;
};

/**
 * One column of the scan-setup roster: a select-all header over a scrollable
 * checkbox list. Rows are labels so the whole row toggles, not just the box.
 */
const RosterList = ({
  label,
  entries,
  selected,
  disabled,
  onToggle,
  onToggleAll,
}: {
  label: string;
  entries: RosterEntry[];
  selected: ReadonlySet<string>;
  disabled: boolean;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}) => {
  const translate = useTranslations("dashboard.simulations.setup");
  const allSelected = entries.length > 0 && selected.size === entries.length;

  // Competitor logos are guessed from a brand name against a third-party
  // service, so a dead or unknown host is normal. Without this the <img> stays
  // mounted and renders the browser's broken-image glyph; tracking the failures
  // lets the row fall back to the same neutral tile a null image gets.
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());

  return (
    <div className="flex flex-col bg-background-rich">
      <div className="flex items-center justify-between border-accent-foreground border-b px-4 py-3">
        <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
          {label} · {selected.size}/{entries.length}
        </p>
        <button
          type="button"
          onClick={onToggleAll}
          disabled={disabled || entries.length === 0}
          className="font-medium text-primary text-xs hover:underline disabled:pointer-events-none disabled:opacity-50"
        >
          {allSelected ? translate("clearAll") : translate("selectAll")}
        </button>
      </div>
      <div className="max-h-80 flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <p className="px-4 py-6 text-foreground-dimmed text-xs">
            {translate("nothingYet")}
          </p>
        ) : (
          entries.map((entry) => (
            // biome-ignore lint/a11y/noLabelWithoutControl: base-ui Checkbox renders a hidden native input inside the label
            <label
              key={entry.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 border-accent-foreground border-b px-4 py-2.5 transition-colors last:border-b-0 hover:bg-background",
                disabled && "pointer-events-none opacity-60",
              )}
            >
              <Checkbox
                checked={selected.has(entry.id)}
                onCheckedChange={() => onToggle(entry.id)}
                disabled={disabled}
              />
              {entry.image && !failed.has(entry.id) ? (
                // Catalog/competitor images come from arbitrary hosts, so
                // next/image (which needs allow-listed domains) is out.
                // biome-ignore lint/performance/noImgElement: arbitrary remote hosts
                <img
                  src={entry.image}
                  alt=""
                  onError={() =>
                    setFailed((previous) => new Set(previous).add(entry.id))
                  }
                  className="size-8 shrink-0 rounded-md bg-background-dimmed object-cover"
                />
              ) : (
                <div className="size-8 shrink-0 rounded-md bg-background-dimmed" />
              )}
              <span
                className="min-w-0 flex-1 truncate text-foreground text-sm"
                title={entry.title}
              >
                {entry.title}
              </span>
              {entry.subtitle && (
                <span className="shrink-0 text-foreground-dimmed text-xs tabular-nums">
                  {entry.subtitle}
                </span>
              )}
            </label>
          ))
        )}
      </div>
    </div>
  );
};

export const SimulationsClient = ({
  store,
  productIds,
  products,
  competitors,
  lastScan,
}: SimulationsClient.Props) => {
  const toast = useToastManager();
  const translate = useTranslations("dashboard.simulations");
  const run = useTranslations("dashboard.simulations.run");

  // The roster for the next run. Detection can append competitors mid-session,
  // so the competitor list is state, not a prop echo. Defaults: every store
  // product, every competitor marked selected at the account level.
  const [competitorList, setCompetitorList] = useState(competitors);
  const [selectedProducts, setSelectedProducts] = useState<ReadonlySet<string>>(
    () => new Set(products.map((product) => product.id)),
  );
  const [selectedCompetitors, setSelectedCompetitors] = useState<
    ReadonlySet<string>
  >(
    () =>
      new Set(
        competitors
          .filter((competitor) => competitor.selected)
          .map((competitor) => competitor.id),
      ),
  );

  const {
    phase,
    stats,
    logs,
    statuses,
    modelStats,
    winRates,
    topFinding,
    count,
    elapsed,
    handleRun,
    isRunning,
    reset,
  } = useScanRunner({
    store,
    onError: (text) =>
      toast.add({
        title: translate("toast.simulationFailed"),
        description: text,
        type: "error",
      }),
  });

  // The live log had no auto-scroll, so new lines appeared off-screen while a
  // simulation streamed. Pin it to the bottom as entries arrive.
  const logRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: new log entries drive the scroll
  useEffect(() => {
    const container = logRef.current;
    if (!container) return;

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [logs]);

  const totalSimulations = selectedProducts.size * selectedCompetitors.size * 3;
  const estimatedDuration = formatScanEstimate(totalSimulations);

  const canRunWinRateScan =
    selectedProducts.size > 0 && selectedCompetitors.size > 0;

  const toggleProduct = (id: string) =>
    setSelectedProducts((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleCompetitor = (id: string) =>
    setSelectedCompetitors((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllProducts = () =>
    setSelectedProducts((previous) =>
      previous.size === products.length
        ? new Set()
        : new Set(products.map((product) => product.id)),
    );

  const toggleAllCompetitors = () =>
    setSelectedCompetitors((previous) =>
      previous.size === competitorList.length
        ? new Set()
        : new Set(competitorList.map((competitor) => competitor.id)),
    );

  const [runScan, isStartingScan] = useAsyncAction(async () => {
    if (!canRunWinRateScan) {
      toast.add({
        title: translate("toast.nothingSelected"),
        description:
          selectedProducts.size === 0
            ? translate("toast.selectProduct")
            : translate("toast.selectCompetitor"),
        type: "error",
      });
      return;
    }
    await handleRun({
      products: [...selectedProducts],
      competitors: [...selectedCompetitors],
    });
  }, false);

  const handleDetectionSuccess = (detected: Competitor.Type[]) => {
    setCompetitorList((previous) => [
      ...previous,
      ...detected.map((record) => ({
        id: record.id,
        title: record.title,
        brand: record.brand,
        price: record.price,
        image: record.image,
        selected: record.selected,
      })),
    ]);
    setSelectedCompetitors(
      (previous) =>
        new Set([...previous, ...detected.map((record) => record.id)]),
    );
  };

  const completedData = (() => {
    if (phase === "complete") {
      return {
        wins: stats.wins,
        losses: stats.losses,
        modelRates: winRates,
        topFinding,
        count,
      };
    }
    if (phase === "pre" && lastScan) {
      return {
        wins: lastScan.wins,
        losses: lastScan.losses,
        modelRates: lastScan.modelRates,
        topFinding: lastScan.topFinding,
        count: products.length,
      };
    }
    return null;
  })();

  return (
    <>
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
              <StatLabel
                label={translate("stats.productsSelected")}
                icon={<ShoppingCartIcon className="size-7.5 text-primary" />}
              />
              <div>
                <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
                  {selectedProducts.size}
                  <span className="ml-1 font-medium text-foreground-dimmed text-xl">
                    / {products.length}
                  </span>
                </p>
                <p className="mt-3 text-foreground-dimmed text-xs">
                  {translate("stats.pickedForScan")}
                </p>
              </div>
            </div>

            <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
              <StatLabel
                label={translate("stats.competitorsSelected")}
                icon={<BullseyeIcon className="size-7.5 text-error" />}
              />
              <div>
                <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
                  {selectedCompetitors.size}
                  <span className="ml-1 font-medium text-foreground-dimmed text-xl">
                    / {competitorList.length}
                  </span>
                </p>
                <p className="mt-3 text-foreground-dimmed text-xs">
                  {translate("stats.pickedForScan")}
                </p>
              </div>
            </div>

            <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
              <StatLabel
                label={translate("stats.estimatedSimulations")}
                icon={<RadarIcon className="size-7.5 text-warning" />}
              />
              <div>
                <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
                  {totalSimulations}
                </p>
                <p className="mt-3 text-foreground-dimmed text-xs">
                  {translate("stats.productsCompetitorsModels")}
                </p>
              </div>
            </div>

            <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
              <StatLabel
                label={translate("stats.estimatedTime")}
                icon={<ClockIcon className="size-7.5 text-foreground-dimmed" />}
              />
              <div>
                <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
                  {estimatedDuration}
                </p>
                <p className="mt-3 text-foreground-dimmed text-xs">
                  {translate("stats.atCurrentSelection")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div className="border-accent-foreground border-b p-4">
            <SectionKicker>{translate("discovery.kicker")}</SectionKicker>
            <h2 className="mt-2 font-semibold text-foreground-rich text-lg">
              {translate("discovery.title")}
            </h2>
            <p className="mt-1 text-foreground-dimmed text-sm">
              {translate("discovery.description")}
            </p>
            <p className="mt-2 text-foreground-dimmed text-xs">
              {translate("discovery.totalCompetitors", {
                count: competitorList.length,
              })}
            </p>
          </div>
          <AutoDetectTab
            products={productIds}
            store={store}
            onSuccess={handleDetectionSuccess}
            className="h-[520px] border-0"
          />
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div className="border-accent-foreground border-b p-4">
            <SectionKicker>{translate("setup.kicker")}</SectionKicker>
            <h2 className="mt-2 font-semibold text-foreground-rich text-lg">
              {translate("setup.title")}
            </h2>
            <p className="mt-1 text-foreground-dimmed text-sm">
              {translate("setup.description")}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-px bg-accent-foreground lg:grid-cols-2">
            <RosterList
              label={translate("setup.products")}
              entries={products.map((product) => ({
                id: product.id,
                title: product.title,
                subtitle: product.price,
                image: product.image,
              }))}
              selected={selectedProducts}
              disabled={isRunning}
              onToggle={toggleProduct}
              onToggleAll={toggleAllProducts}
            />
            <RosterList
              label={translate("setup.competitors")}
              entries={competitorList.map((competitor) => ({
                id: competitor.id,
                title: competitor.title,
                subtitle: competitor.brand ?? competitor.price,
                image: competitor.image,
              }))}
              selected={selectedCompetitors}
              disabled={isRunning}
              onToggle={toggleCompetitor}
              onToggleAll={toggleAllCompetitors}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-t px-4 py-3">
            <p className="text-foreground-dimmed text-xs">
              {translate("setup.estimate", {
                products: selectedProducts.size,
                competitors: selectedCompetitors.size,
              })}
            </p>
            <p className="font-medium text-foreground text-sm tabular-nums">
              {translate("setup.estimateTotal", {
                total: totalSimulations,
                duration: estimatedDuration,
              })}
            </p>
          </div>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div className="flex items-center justify-between border-accent-foreground border-b p-4">
            <div>
              <SectionKicker>{run("kicker")}</SectionKicker>
              <h2 className="mt-2 font-semibold text-foreground-rich text-lg">
                {run("title")}
              </h2>
              <p className="mt-1 text-foreground-dimmed text-sm">
                {run("description")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                color="accent"
                type="button"
                onClick={reset}
                disabled={isRunning || isStartingScan}
              >
                {run("reset")}
              </Button>
              <Button
                color="primary"
                type="button"
                onClick={runScan}
                disabled={!canRunWinRateScan || isRunning || isStartingScan}
              >
                {run("runSimulation")}
              </Button>
            </div>
          </div>

          {completedData ? (
            <SimulationComplete data={completedData} />
          ) : (
            <>
              {/* Explicit, labeled progress bar. It used to be a bare blue seam
                  between the bands — nobody read that as "progress". */}
              <div className="border-accent-foreground border-b bg-background-rich px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                    {run("progress")}
                  </p>
                  <span className="font-mono font-semibold text-primary-text text-sm tabular-nums">
                    {stats.progress}%
                  </span>
                </div>
                <Progress value={stats.progress} className="mt-2" />
              </div>

              {/* Progress now lives in the labeled bar above, so the stat band
                  is a clean 3-up (no phantom 4th cell). */}
              <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-3">
                <StatCell
                  label={run("phase")}
                  icon={<RadarIcon className="size-7.5 text-primary" />}
                  value={phase}
                  caption={run("currentStage")}
                />
                <StatCell
                  label={run("winsLosses")}
                  icon={<AwardIcon className="size-7.5 text-success" />}
                  value={`${stats.wins} / ${stats.losses}`}
                  caption={run("acrossAllModels")}
                />
                <StatCell
                  label={run("elapsed")}
                  icon={
                    <ClockIcon className="size-7.5 text-foreground-dimmed" />
                  }
                  value={formatElapsed(elapsed)}
                  caption={run("sinceStart")}
                />
              </div>

              {/* border-t separates the model band from the stats above (the
                  progress seam that used to do that job moved up). */}
              <div className="grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-3">
                {models.map(({ id, label, logo }) => (
                  <div
                    key={id}
                    className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background"
                  >
                    {/* Logo left, status pinned right — mirrors StatLabel's
                        icon placement in the Discovery cells. */}
                    <div className="flex items-start justify-between gap-2">
                      <Image
                        src={logo}
                        alt={label}
                        width={32}
                        height={32}
                        className="size-8"
                      />
                      <StatusPill
                        tone={(() => {
                          switch (true) {
                            case statuses[label] === "complete":
                              return "success";
                            case statuses[label] === "running":
                              return "primary";
                            default:
                              return "neutral";
                          }
                        })()}
                      >
                        {(() => {
                          switch (true) {
                            case statuses[label] === "complete":
                              return run("status.done");
                            case statuses[label] === "running":
                              return run("status.running");
                            default:
                              return run("status.queued");
                          }
                        })()}
                      </StatusPill>
                    </div>
                    <div>
                      <p className="font-bold text-2xl text-foreground-rich tracking-[-0.02em]">
                        {label}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 tabular-nums">
                        <span className="font-medium text-success text-xs">
                          {modelStats[label]?.wins ?? 0}W
                        </span>
                        <span className="text-foreground-dimmed text-xs">
                          ·
                        </span>
                        <span className="font-medium text-error text-xs">
                          {modelStats[label]?.losses ?? 0}L
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live output is a grid cell, not a rounded bordered panel.
                  Radius is reserved for interactive/elevated elements —
                  grid cells stay sharp. design.md §3.1 / §6 */}
              <div className="relative border-accent-foreground border-t">
                <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
                <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
                <div className="flex items-center justify-between border-accent-foreground border-b bg-background-rich px-5 py-3">
                  <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                    {run("liveOutput")}
                  </p>
                  <span className="font-mono text-foreground-dimmed text-xs tabular-nums">
                    {run("lineCount", { count: logs.length })}
                  </span>
                </div>
                <div
                  ref={logRef}
                  className="max-h-72 overflow-y-auto scroll-smooth bg-background-rich px-5 py-4"
                >
                  {logs.length === 0 ? (
                    <p className="font-mono text-foreground-dimmed text-xs">
                      {run("noLogsYet")}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {logs.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-baseline gap-2 font-mono text-xs"
                        >
                          {/* Fixed width so every message starts on the same
                              column instead of a ragged left edge. */}
                          <span
                            className={cn(
                              "w-16 shrink-0 font-medium",
                              modelColors[entry.model] ??
                                "text-foreground-dimmed",
                            )}
                          >
                            [{entry.model}]
                          </span>
                          {/* truncate + title: one clean line each, full text on
                              hover, instead of ragged mid-word cuts. */}
                          <span
                            className="min-w-0 flex-1 truncate text-foreground"
                            title={entry.message}
                          >
                            {entry.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

type SimulationCompleteData = {
  wins: number;
  losses: number;
  modelRates: Record<string, { wins: number; losses: number; rate: number }>;
  topFinding: Simulate.TopFinding | null;
  count: number;
};

const SimulationComplete = ({ data }: { data: SimulationCompleteData }) => {
  const translate = useTranslations("dashboard.simulations.complete");
  const { wins, losses, modelRates, topFinding, count } = data;
  const winRate =
    wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  const winRateColor = (() => {
    switch (true) {
      case winRate < 30:
        return "text-error";
      case winRate < 60:
        return "text-warning";
      default:
        return "text-success";
    }
  })();

  return (
    <>
      <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
          <StatLabel
            label={translate("winRate")}
            icon={<AwardIcon className="size-7.5 text-success" />}
          />
          <p
            className={cn(
              "font-bold text-4xl tabular-nums tracking-[-0.02em]",
              winRateColor,
            )}
          >
            {winRate}
            <span className="ml-0.5 font-medium text-foreground-dimmed text-xl">
              %
            </span>
          </p>
        </div>
        <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
          <StatLabel
            label={translate("products")}
            icon={<ShoppingCartIcon className="size-7.5 text-primary" />}
          />
          <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
            {count}
          </p>
        </div>
        <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
          <StatLabel
            label={translate("wins")}
            icon={<TrendUpIcon className="size-7.5 text-success" />}
          />
          <p className="font-bold text-4xl text-success tabular-nums tracking-[-0.02em]">
            {wins}
          </p>
        </div>
        <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
          <StatLabel
            label={translate("losses")}
            icon={<TrendDownIcon className="size-7.5 text-error" />}
          />
          <p className="font-bold text-4xl text-error tabular-nums tracking-[-0.02em]">
            {losses}
          </p>
        </div>
      </div>

      {/* 3 models — see note above: a 4-col grid leaves a phantom empty cell. */}
      <div className="grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-3">
        {models.map(({ id, label, logo }) => {
          const rates = modelRates[id];
          const rate = rates?.rate ?? 0;
          return (
            <div
              key={id}
              className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background"
            >
              {/* Logo left, rate right — same cell language as the running state. */}
              <div className="flex items-start justify-between gap-2">
                <Image
                  src={logo}
                  alt={label}
                  width={32}
                  height={32}
                  className="size-8"
                />
                <span className="font-bold text-foreground-rich text-xl tabular-nums tracking-[-0.02em]">
                  {rate}
                  <span className="ml-0.5 font-medium text-foreground-dimmed text-sm">
                    %
                  </span>
                </span>
              </div>
              <div>
                <p className="font-bold text-2xl text-foreground-rich tracking-[-0.02em]">
                  {label}
                </p>
                <div className="mt-2 flex items-center gap-1.5 tabular-nums">
                  <span className="font-medium text-success text-xs">
                    {rates?.wins ?? 0}W
                  </span>
                  <span className="text-foreground-dimmed text-xs">·</span>
                  <span className="font-medium text-error text-xs">
                    {rates?.losses ?? 0}L
                  </span>
                </div>
                <Progress value={rate} className="mt-3" />
              </div>
            </div>
          );
        })}
      </div>

      {topFinding && (
        // A band, not a rounded island — it sits in the grid.
        <TopFindingCallout className="border-accent-foreground border-t px-5 py-4">
          {translate("topFinding", {
            name: topFinding.name,
            attributes: topFinding.missingAttributes.join(" and "),
            impact: topFinding.impactDescription,
            loss: topFinding.lossPercentage,
          })}
        </TopFindingCallout>
      )}
    </>
  );
};
