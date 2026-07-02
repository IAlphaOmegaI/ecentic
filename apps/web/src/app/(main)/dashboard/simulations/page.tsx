import { resultify, unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatRelativeTime } from "@/lib/date";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import * as Scan from "@/server/app/scan";
import { Environment } from "@/server/utils/environment";
import { Crosshair, SectionGutter, StatusPill } from "../_components/grid";
import { SimulationsClient } from "./_components/simulations-client";

const progressLabels = [
  "Phase",
  "Progress",
  "Wins / Losses",
  "Elapsed",
] as const;
const modelLabels = ["GPT-4", "Claude", "Gemini", "Perplexity"] as const;

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div>
            <Suspense
              fallback={
                <div className="h-4 w-56 animate-pulse bg-foreground/10" />
              }
            >
              <LastRun />
            </Suspense>
            <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
              Simulations
            </h1>
            <p className="mt-1 text-foreground-dimmed text-sm">
              Re-run competitor discovery and win-rate simulations anytime.
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<SimulationsSkeleton />}>
        <SimulationsData />
      </Suspense>
    </div>
  </div>
);

const LastRun = async () => {
  await connection();
  const latestScans = await resultify(() =>
    unwrapResult(Scan.getLatest(Environment.SERVER, { limit: 1 })),
  );
  const latestScan = latestScans.success ? (latestScans.data[0] ?? null) : null;

  return (
    <StatusPill tone={latestScan ? "success" : "neutral"}>
      {latestScan
        ? `Last simulation ${formatRelativeTime(latestScan.createdAt)}`
        : "No simulations run yet"}
    </StatusPill>
  );
};

const SimulationsData = async () => {
  await connection();

  const [products, competitors] = await Promise.all([
    unwrapResult(Product.skimForCurrentUser(Environment.SERVER)),
    unwrapResult(Competitor.skimForCurrentUser(Environment.SERVER)),
  ]);

  const selected = competitors.filter((record) => record.selected);

  const latestScans = await resultify(() =>
    unwrapResult(Scan.getLatest(Environment.SERVER, { limit: 1 })),
  );
  const latestCompletedScan = latestScans.success
    ? (latestScans.data.find((scan) => scan.status === "complete") ?? null)
    : null;

  const lastScan = await (async () => {
    if (!latestCompletedScan) return null;
    const result = await Scan.getShareData(Environment.SERVER, {
      id: latestCompletedScan.id,
    });
    if (!result.success) return null;
    return {
      id: result.data.scan.id,
      wins: result.data.scan.wins,
      losses: result.data.scan.losses,
      topFinding: result.data.scan.topFinding ?? null,
      modelRates: result.data.modelRates,
    };
  })();

  return (
    <SimulationsClient
      productIds={products.map((record) => record.id)}
      productCount={products.length}
      competitorCount={competitors.length}
      selectedCompetitorCount={selected.length}
      lastScan={lastScan}
    />
  );
};

const SimulationsSkeleton = () => (
  <>
    <div className="-mx-8 border-accent-foreground border-b">
      <div className="relative mx-8 bg-background-rich">
        <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div className="grid grid-cols-1 gap-px bg-accent-foreground xl:grid-cols-3">
          {(["a", "b", "c"] as const).map((key) => (
            <div
              key={key}
              className="relative flex h-44 flex-col justify-between bg-background-rich p-5"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-28 animate-pulse bg-foreground/10" />
                <div className="absolute top-5 right-5 size-7.5 animate-pulse bg-foreground/10" />
              </div>
              <div>
                <div className="h-11 w-24 animate-pulse bg-foreground/10" />
                <div className="mt-3 h-4 w-32 animate-pulse bg-foreground/10" />
              </div>
            </div>
          ))}
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
          <div className="h-3 w-32 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-6 w-52 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-4 w-80 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-3.5 w-44 animate-pulse bg-foreground/10" />
        </div>
        <div className="h-[520px] animate-pulse bg-foreground/5" />
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
            <div className="h-3 w-32 animate-pulse bg-foreground/10" />
            <div className="mt-2 h-6 w-44 animate-pulse bg-foreground/10" />
            <div className="mt-2 h-4 w-96 animate-pulse bg-foreground/10" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-20 animate-pulse bg-foreground/10" />
            <div className="h-9 w-32 animate-pulse bg-foreground/10" />
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-4">
            {progressLabels.map((label) => (
              <div key={label} className="bg-background-rich p-3">
                <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                  {label}
                </p>
                <div className="mt-1 h-5 w-16 animate-pulse bg-foreground/10" />
              </div>
            ))}
          </div>
          <div className="h-1.5 w-full rounded-full bg-accent-foreground" />
          <div className="grid grid-cols-2 gap-px bg-accent-foreground sm:grid-cols-4">
            {modelLabels.map((label) => (
              <div key={label} className="bg-background-rich p-3">
                <div className="size-8 animate-pulse bg-foreground/10" />
                <div className="mt-2 h-5 w-16 animate-pulse bg-foreground/10" />
                <div className="mt-1 h-3.5 w-12 animate-pulse bg-foreground/10" />
                <div className="mt-1 h-3.5 w-16 animate-pulse bg-foreground/10" />
              </div>
            ))}
          </div>
          <div className="h-72 rounded-md border border-accent-foreground bg-background-dimmed p-3">
            <div className="h-3.5 w-72 animate-pulse bg-foreground/10" />
          </div>
        </div>
      </div>
    </div>
  </>
);
