"use client";

import { cn } from "@zenncore/utils";
import { useTranslations } from "next-intl";
import type { PropsWithChildren, ReactNode } from "react";

export const Crosshair = ({ className }: { className?: string }) => (
  <svg
    aria-hidden
    viewBox="0 0 12 12"
    fill="none"
    className={cn(
      "pointer-events-none absolute z-10 size-3 text-accent-rich",
      className,
    )}
  >
    <path d="M6 0v12M0 6h12" stroke="currentColor" strokeWidth="1" />
  </svg>
);

// design.md §3.4: hatch bands are intentional and slim — 16px tall at ~0.6
// opacity, not a full-strength 24px stripe. Used app-wide, so one place.
export const SectionGutter = () => (
  <div className="h-4 bg-grid-stripes opacity-60" />
);

/**
 * Renders a shell slot as an only child.
 *
 * Slots are built in `page.tsx` — a server component — so they reach the shell
 * through the RSC payload, which strips the static key check React applies to
 * children it sees at JSX time. Dropped in beside the corner marks they become
 * an unchecked entry in a children array, and React warns about a missing key
 * even though a shell's slots are fixed regions, not a list. An only child is
 * never an array, so there is no key to miss.
 */
export const Slot = ({ children }: PropsWithChildren) => children;

export const SectionKicker = ({ children }: PropsWithChildren) => {
  if (typeof children !== "string")
    return (
      <p className="font-medium text-[11px] text-foreground-dimmed uppercase">
        {children}
      </p>
    );

  const [index, ...label] = children.split("—");

  return (
    <p className="font-medium text-[11px] text-foreground-dimmed uppercase">
      <span className="font-mono font-semibold text-primary">
        {index?.trim()}
      </span>
      {label.length > 0 && (
        <span className="ml-2">{label.join("—").trim()}</span>
      )}
    </p>
  );
};

/**
 * The canonical dashboard page header — design.md §11.2.
 *
 * Store pages had drifted into four different headers: three eyebrow styles,
 * three title sizes, and one variant that pushed the description into a
 * bordered side column. The composition is fixed here so a page supplies only
 * its content: an optional context label, the title, one line of description,
 * and at most a primary plus secondary action.
 *
 * `context` is deliberately a string rather than a node. It renders as a
 * neutral pill because a page-level label is metadata, not emphasis — blue
 * belongs to action and selection (§4.5), not to a badge on every page.
 */
export const PageHeader = ({
  context,
  title,
  description,
  actions,
}: {
  context?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <div className="-mx-8 border-accent-foreground border-b">
    <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
      <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      <div className="min-w-0">
        {context && <StatusPill>{context}</StatusPill>}
        <h1
          className={cn(
            "font-bold text-[28px] text-foreground-rich tracking-[-0.02em]",
            context && "mt-3",
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-3">{actions}</div>
      )}
    </div>
  </div>
);

/**
 * One horizontal band of the store page rail — design.md §6.3.
 *
 * Every store page repeats the same three-part trick: break the `mx-8` rail
 * with `-mx-8`, draw the full-width seam, then restore the rail inside. The
 * corner marks register where that seam meets the rail, so which edges are
 * marked follows from where the band sits: a band opening a page marks its
 * bottom, a band arriving after a hatch gutter marks its top.
 */
export const Band = ({
  marks = "bottom",
  surface = true,
  className,
  children,
}: PropsWithChildren<{
  marks?: "top" | "bottom" | "both" | "none";
  surface?: boolean;
  className?: string;
}>) => {
  const marksTop = marks === "top" || marks === "both";
  const marksBottom = marks === "bottom" || marks === "both";

  return (
    <div
      className={cn(
        "-mx-8 border-accent-foreground",
        marksTop ? "border-t border-b" : "border-b",
      )}
    >
      <div
        className={cn(
          "relative mx-8",
          surface && "bg-background-rich",
          className,
        )}
      >
        {marksTop && (
          <>
            <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          </>
        )}
        {marksBottom && (
          <>
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          </>
        )}
        <Slot>{children}</Slot>
      </div>
    </div>
  );
};

/**
 * The header of a section inside a band — design.md §5.4, §6.8.
 *
 * Pairs the numbered kicker with a panel title so a section announces both
 * where it sits in the page's order and what question it answers.
 */
export const SectionHeader = ({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <div className="flex flex-col gap-4 border-accent-foreground border-b p-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {kicker && <SectionKicker>{kicker}</SectionKicker>}
      <p
        className={cn(
          "font-semibold text-foreground-rich text-lg",
          kicker && "mt-2",
        )}
      >
        {title}
      </p>
      {description && (
        <p className="mt-1 max-w-3xl text-foreground-dimmed text-sm">
          {description}
        </p>
      )}
    </div>
    {actions && (
      <div className="flex shrink-0 items-center gap-3">{actions}</div>
    )}
  </div>
);

const statusPillTones = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
  primary: "bg-primary/10 text-primary",
  neutral: "bg-background-dimmed text-foreground-dimmed",
} as const;

export const StatusPill = ({
  tone = "neutral",
  className,
  children,
}: PropsWithChildren<{
  tone?: keyof typeof statusPillTones;
  className?: string;
}>) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold text-[11px] uppercase tracking-[0.05em]",
      statusPillTones[tone],
      className,
    )}
  >
    {children}
  </span>
);

const STAT_FILLS = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
} as const;

/**
 * A cell in a connected stat grid — design.md §11.3.
 *
 * Lifted from the products page, which had the only correct implementation, so
 * pages stop each inventing their own. Drop these into a
 * `grid gap-px bg-accent-foreground` and give every cell in one grid the same
 * parts: uneven cells are what makes a stat row look assembled by hand.
 */
export const StatCell = ({
  label,
  icon,
  value,
  suffix,
  progress,
  detail,
  tone = "primary",
}: {
  label: string;
  icon: ReactNode;
  value: ReactNode;
  suffix?: string;
  /** 0–100. Omit when the value has no natural ceiling. */
  progress?: number;
  detail?: ReactNode;
  tone?: keyof typeof STAT_FILLS;
}) => (
  <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
    <StatLabel label={label} icon={icon} />
    <div>
      <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
        {value}
        {suffix && (
          <span className="ml-1 font-medium text-foreground-dimmed text-xl">
            {suffix}
          </span>
        )}
      </p>
      {(progress !== undefined || detail) && (
        <div className="mt-3">
          {progress !== undefined && (
            <div className="h-1 w-full rounded-full bg-accent-foreground">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-600",
                  STAT_FILLS[tone],
                )}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
          {detail && (
            <div className="mt-2 text-foreground-dimmed text-xs">{detail}</div>
          )}
        </div>
      )}
    </div>
  </div>
);

export const TopFindingCallout = ({
  label,
  className,
  children,
}: PropsWithChildren<{ label?: string; className?: string }>) => {
  const translate = useTranslations("dashboard.grid");
  const resolvedLabel = label ?? translate("topFinding");

  return (
    <div className={cn("bg-primary/5 px-4 py-3", className)}>
      <p className="font-medium text-[10px] text-primary uppercase tracking-[0.08em]">
        {resolvedLabel}
      </p>
      <p className="mt-1 max-w-3xl text-foreground text-sm">{children}</p>
    </div>
  );
};

export const WinRateBadge = ({ rate }: { rate: number }) => {
  const translate = useTranslations("dashboard.grid");

  return (
    <span
      className={cn(
        "whitespace-nowrap rounded px-1.5 py-0.5 font-semibold text-[10px] uppercase tabular-nums tracking-[0.06em]",
        rate >= 50 ? "bg-success/10 text-success" : "bg-error/10 text-error",
      )}
    >
      {translate("winRateBadge", { rate: String(rate) })}
    </span>
  );
};

export const StatLabel = ({
  label,
  icon,
}: {
  label: string;
  icon: ReactNode;
}) => (
  <div className="flex items-center justify-between gap-2">
    <p className="pr-12 font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
      {label}
    </p>
    <span className="absolute top-5 right-5 text-foreground-dimmed">
      {icon}
    </span>
  </div>
);
