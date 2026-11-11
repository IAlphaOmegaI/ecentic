"use client";

import { cn } from "@zenncore/utils";
import {
  Tooltip,
  TooltipPopup,
  TooltipPositioner,
  TooltipTrigger,
} from "@zenncore/web/components/tooltip";
import { type ReactNode, useId } from "react";
import { fonts } from "./fonts";

export const EvidenceView = ({ children }: EvidenceView.Props) => (
  <div>{children}</div>
);

export namespace EvidenceView {
  export type Props = {
    id: string;
    title: string;
    columns: readonly string[];
    rows: readonly (readonly string[])[];
    action: { primary: string; secondary: string };
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
        className="block h-auto w-full min-w-0 cursor-help rounded-xs px-0 py-6 text-left text-foreground hover:bg-transparent focus-visible:bg-transparent focus-visible:outline-2 focus-visible:outline-primary-text focus-visible:outline-offset-4 active:bg-transparent data-popup-open:bg-transparent"
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
  pending,
}: EvidenceMeter.Props) => (
  <EvidenceDatum detail={detail} source={source}>
    <span className="grid gap-4 sm:grid-cols-[minmax(100px,0.65fr)_1.35fr] sm:items-start">
      <span className="font-heading text-[clamp(2rem,4vw,3.5rem)] text-primary-text tabular-nums leading-none tracking-tight">
        {value}
      </span>
      <span>
        <span className="block max-w-[42ch] font-medium text-base text-foreground-rich leading-snug">
          {label}
        </span>
        {meta && (
          <span className="mt-2 block text-foreground-dimmed text-sm">
            {meta}
          </span>
        )}
        {pending && (
          <span className="mt-2 block text-foreground-dimmed text-xs">
            {pending}
          </span>
        )}
      </span>
    </span>
    {percentage !== null && (
      <span
        aria-hidden
        className="mt-6 block overflow-hidden whitespace-pre font-mono text-primary/60 text-xs tracking-[0.12em]"
      >
        {Array.from({ length: 40 }, (_, index) =>
          index < Math.round(percentage / 2.5) ? "#" : ":",
        ).join("")}
      </span>
    )}
  </EvidenceDatum>
);

export namespace EvidenceMeter {
  export type Props = {
    label: string;
    value: string;
    percentage: number | null;
    detail: string;
    source: string;
    meta?: string;
    pending?: string;
  };
}
