"use client";

import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { useState } from "react";

type TopFinding = {
  name: string;
  missingAttributes: string[];
  impactDescription: string;
  lossPercentage: number;
};

export type ScanInsight = {
  id: string;
  date: string;
  wins: number;
  losses: number;
  completedSimulations: number;
  topFinding: TopFinding | null;
};

const parseFinding = (raw: string | null): TopFinding | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TopFinding;
  } catch {
    return null;
  }
};

const WinRatePill = ({ wins, losses }: { wins: number; losses: number }) => {
  const total = wins + losses;
  const rate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const color = (() => {
    switch (true) {
      case rate >= 60:
        return "text-success";
      case rate >= 30:
        return "text-warning";
      default:
        return "text-error";
    }
  })();

  return (
    <div className="flex items-center gap-3">
      <span className={cn("font-medium text-2xl tabular-nums", color)}>
        {rate}%
      </span>
      <span className="font-light text-foreground-dimmed text-sm">
        {wins}W / {losses}L
      </span>
    </div>
  );
};

const InsightCard = ({ scan }: { scan: ScanInsight }) => {
  const finding = scan.topFinding;

  return (
    <div className="flex flex-col">
      {finding ? (
        <>
          <div className="p-6">
            <div className="border-primary border-l-2 pl-4">
              <p className="font-medium text-foreground text-lg leading-snug">
                {finding.name}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-px border-accent-foreground border-y bg-accent-foreground sm:grid-cols-[1fr_auto]">
            <div className="bg-primary p-6">
              <p className="mb-2 font-light text-background uppercase tracking-widest">
                Impact
              </p>
              <p className="text-white leading-relaxed">
                {finding.impactDescription}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center border-accent-foreground border-l bg-background-dimmed p-6">
              <span className="font-medium text-4xl text-error tabular-nums">
                {finding.lossPercentage}%
              </span>
              <p className="mt-2 font-light text-foreground-dimmed text-sm">
                of sims lost
              </p>
            </div>
          </div>

          {finding.missingAttributes.length > 0 && (
            <div className="flex flex-col gap-4 p-4">
              <p className="font-light text-foreground-dimmed uppercase tracking-widest">
                Missing Attributes
              </p>
              <div className="flex flex-wrap gap-2">
                {finding.missingAttributes.map((attr) => (
                  <span
                    key={attr}
                    className="border border-primary/30 bg-primary/10 px-2.5 py-1 font-light text-primary text-sm"
                  >
                    {attr}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="font-light text-foreground-dimmed">
          No finding recorded for this scan.
        </p>
      )}

      <div className="flex items-center justify-between border-accent-foreground border-t p-6">
        <WinRatePill wins={scan.wins} losses={scan.losses} />
        <Button
          variant="outline"
          color="primary"
          render={<Link href="/dashboard/optimize" />}
        >
          Fix this <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
};

export namespace ScanInsightsCarousel {
  export type Props = {
    scans: Array<{
      id: string;
      date: string;
      wins: number;
      losses: number;
      completedSimulations: number;
      topFinding: string | null;
    }>;
  };
}

export const ScanInsightsCarousel = ({ scans }: ScanInsightsCarousel.Props) => {
  const [index, setIndex] = useState(0);

  const parsed: ScanInsight[] = scans.map((scan) => ({
    ...scan,
    topFinding: parseFinding(scan.topFinding),
  }));

  const current = parsed[index];

  console.log(current);

  if (!current) return null;

  const formatted = new Date(current.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div>
      <div className="flex items-start justify-between border-accent-foreground border-b p-6">
        <div>
          <p className="font-light text-foreground-dimmed uppercase tracking-widest">
            Insights
          </p>
          <p className="mt-1 font-medium text-2xl text-foreground">
            Scan Results
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <p className="font-light text-primary">{formatted}</p>
          <p className="font-light text-foreground-dimmed">
            {current.completedSimulations} simulations
          </p>
        </div>
      </div>

      <InsightCard scan={current} />

      {parsed.length > 1 && (
        <div className="flex items-center justify-between border-accent-foreground border-t p-6">
          <Button
            variant="outline"
            color="accent"
            size="icon"
            disabled={index === 0}
            onClick={() => setIndex((prvious) => Math.max(0, prvious - 1))}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>

          <div className="flex items-center gap-1.5">
            {parsed.map((_, i) => (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: we want to use the index as the key
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  "size-3 transition-all",
                  i === index
                    ? "bg-primary"
                    : "bg-accent-foreground hover:bg-foreground-dimmed",
                )}
              />
            ))}
          </div>

          <Button
            variant="outline"
            color="accent"
            size="icon"
            disabled={index === parsed.length - 1}
            onClick={() =>
              setIndex((previous) => Math.min(parsed.length - 1, previous + 1))
            }
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
