"use client";

import { cn } from "@zenncore/utils";
import {
  Tooltip,
  TooltipPopup,
  TooltipPositioner,
  TooltipTrigger,
} from "@zenncore/web/components/tooltip";
import { useFormatter } from "next-intl";
import { type ReactNode, useId } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { fonts } from "./fonts";

export const EvidenceView = ({ children }: EvidenceView.Props) => (
  <div>{children}</div>
);

export namespace EvidenceView {
  export type Props = {
    children: ReactNode;
  };
}

export const EvidenceDatum = ({
  detail,
  source,
  children,
}: EvidenceDatum.Props) => {
  const description = useId();

  return (
    <Tooltip>
      <TooltipTrigger
        aria-describedby={description}
        className="block h-auto w-full min-w-0 cursor-help rounded-xs p-0 text-left text-foreground hover:bg-transparent focus-visible:bg-transparent focus-visible:outline-2 focus-visible:outline-primary-text focus-visible:outline-offset-4 active:bg-transparent data-popup-open:bg-transparent"
      >
        {children}
      </TooltipTrigger>
      <TooltipPositioner keepMounted side="top" align="start" className="z-100">
        <TooltipPopup
          id={description}
          role="tooltip"
          className={cn(
            fonts,
            "max-w-[min(360px,calc(100vw-32px))] gap-2 rounded-md border-accent-foreground bg-background-rich px-4 py-3 font-body text-foreground text-sm leading-relaxed shadow-none [font-synthesis:none]",
          )}
        >
          <p>{detail}</p>
          <p className="text-foreground-dimmed">{source}</p>
        </TooltipPopup>
      </TooltipPositioner>
    </Tooltip>
  );
};

export namespace EvidenceDatum {
  export type Props = {
    detail: string;
    source: string;
    children: ReactNode;
  };
}

export const EvidenceMeter = ({
  label,
  value,
  percentage,
  detail,
  source,
  meta,
}: EvidenceMeter.Props) => {
  const format = useFormatter();
  const share = format.number(percentage / 100, {
    style: "percent",
    maximumFractionDigits: 1,
  });

  return (
    <div className="min-w-0 py-6">
      <EvidenceDatum detail={detail} source={source}>
        <span className="grid min-w-0 gap-4 sm:grid-cols-[max-content_minmax(0,1fr)] sm:items-start">
          <span
            data-evidence-value
            className="whitespace-nowrap font-body font-medium text-[clamp(2rem,3.5vw,3rem)] text-primary-text proportional-nums leading-none tracking-tight"
          >
            {value}
          </span>
          <span className="min-w-0">
            <span className="block max-w-[42ch] font-medium text-base text-foreground-rich leading-snug">
              {label}
            </span>
            {meta && (
              <span className="mt-2 block text-foreground-dimmed text-sm">
                {meta}
              </span>
            )}
          </span>
        </span>
      </EvidenceDatum>
      <div
        role="img"
        aria-label={`${label}: ${share}. ${detail}`}
        className="mt-4 h-16 w-full min-w-0 font-body"
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart
            accessibilityLayer={false}
            aria-hidden
            data={[{ percentage }]}
            layout="vertical"
            margin={{ top: 0, right: 20, bottom: 0, left: 20 }}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              tickFormatter={(tick: number) =>
                format.number(tick / 100, { style: "percent" })
              }
              tick={{ fill: "var(--color-foreground-dimmed)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis type="category" hide />
            <Bar
              dataKey="percentage"
              fill="var(--color-primary)"
              background={{ fill: "var(--color-accent-foreground)", radius: 6 }}
              barSize={12}
              radius={6}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export namespace EvidenceMeter {
  export type Props = {
    label: string;
    value: string;
    percentage: number;
    detail: string;
    source: string;
    meta?: string;
  };
}
