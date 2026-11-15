"use client";

import { cn } from "@zenncore/utils";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { CustomHairlineFigure } from "@/components/hairline/custom-figure";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import { Motion } from "@/components/motion";

/** Clear server HTML first; one brief reveal enhances a newly mounted state. */
const StateReveal = ({
  children,
  className,
  pending = false,
}: {
  children: ReactNode;
  className?: string;
  pending?: boolean;
}) => {
  const { ready, reduced } = useInteractive();
  const blurSample = useRef<HTMLSpanElement>(null);
  const [blurFilter, setBlurFilter] = useState("blur(0px)");
  useLayoutEffect(() => {
    const sample = blurSample.current;
    if (!sample || !ready || reduced) return;
    const filter =
      sample.ownerDocument.defaultView?.getComputedStyle(sample).filter;
    // Motion cannot interpolate a CSS variable inside blur(). Resolve the
    // theme utility first, so a theme change cannot introduce a parallel value.
    if (filter && filter !== "none") setBlurFilter(filter);
  }, [ready, reduced]);
  return (
    <Motion.Item
      data-feedback-state={pending ? "loading" : "empty"}
      role={pending ? "status" : undefined}
      aria-busy={pending || undefined}
      initial={false}
      animate={
        ready && !reduced && blurFilter !== "blur(0px)"
          ? {
              opacity: [0.85, 1],
              filter: [blurFilter, "blur(0px)"],
            }
          : { opacity: 1, filter: "blur(0px)" }
      }
      transition={{ duration: reduced ? 0 : 0.2, ease: "easeOut" }}
      className={cn("min-w-0 motion-reduce:filter-none", className)}
    >
      <span
        ref={blurSample}
        aria-hidden
        className="pointer-events-none absolute size-0 blur-sm"
      />
      {children}
    </Motion.Item>
  );
};

export const FeedbackState = ({
  title,
  description,
  figure,
  children,
  className,
  compact = false,
  surface = "rich",
  scope = "section",
}: FeedbackState.Props) => (
  <StateReveal
    className={cn(
      "flex min-w-0 flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8",
      scope === "page" &&
        "flex-1 items-center justify-center sm:justify-center",
      compact ? "px-4 py-5 sm:px-6" : "px-4 py-8 sm:px-6",
      surface === "dark"
        ? "bg-emphasis text-background-rich"
        : surface === "background"
          ? "bg-background text-foreground"
          : "bg-background-rich text-foreground",
      className,
    )}
  >
    <div
      aria-hidden
      className={cn("shrink-0", compact ? "w-24 sm:w-28" : "w-32 sm:w-44")}
    >
      <CustomHairlineFigure
        name={figure}
        label=""
        surface={surface}
        className="bg-transparent"
      />
    </div>
    <div className="min-w-0 max-w-2xl flex-1">
      <h2
        className={cn(
          "font-heading font-semibold",
          compact ? "text-lg" : "text-xl",
          surface === "dark" ? "text-background-rich" : "text-foreground-rich",
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "mt-2 text-pretty text-sm leading-6",
            surface === "dark"
              ? "text-background-rich/65"
              : "text-foreground-dimmed",
          )}
        >
          {description}
        </p>
      )}
      {children && (
        <div className="mt-5 flex flex-wrap items-center gap-3">{children}</div>
      )}
    </div>
  </StateReveal>
);

export namespace FeedbackState {
  export type Props = {
    title: string;
    description?: string;
    figure: CustomHairlineFigure.Props["name"];
    children?: ReactNode;
    className?: string;
    compact?: boolean;
    surface?: "rich" | "background" | "dark";
    scope?: "page" | "section";
  };
}

/** Indeterminate work: a relevant inspection subject, no invented percentage. */
export const FeedbackLoading = ({
  title,
  description,
  figure = "inspection-queue",
  children,
  className,
  compact = false,
  surface = "rich",
  scope = "section",
}: FeedbackLoading.Props) => (
  <StateReveal
    pending
    className={cn(
      "flex items-center gap-4",
      scope === "page" && "flex-1 justify-center",
      compact ? "px-4 py-4" : "px-4 py-8 sm:gap-8 sm:px-6",
      surface === "dark"
        ? "bg-emphasis text-background-rich"
        : surface === "background"
          ? "bg-background text-foreground"
          : "bg-background-rich text-foreground",
      className,
    )}
  >
    <div
      aria-hidden
      className={cn(
        "shrink-0 motion-reduce:[&_*]:animate-none",
        compact ? "w-24 sm:w-28" : "w-28 sm:w-40",
      )}
    >
      <CustomHairlineFigure
        name={figure}
        label=""
        surface={surface}
        className="bg-transparent"
      />
    </div>
    <div className="min-w-0 max-w-xl flex-1">
      <p
        className={cn(
          "font-semibold",
          compact ? "text-sm" : "text-base",
          surface === "dark" ? "text-background-rich" : "text-foreground-rich",
        )}
      >
        {title}
      </p>
      {description && (
        <p
          className={cn(
            "mt-2 text-pretty text-sm leading-6",
            surface === "dark"
              ? "text-background-rich/65"
              : "text-foreground-dimmed",
          )}
        >
          {description}
        </p>
      )}
      <div
        aria-hidden
        className="mt-4 space-y-2 motion-reduce:[&_*]:animate-none"
      >
        <div
          className={cn(
            "h-1.5 w-32 max-w-full animate-pulse rounded-full",
            surface === "dark"
              ? "bg-background-rich/20"
              : "bg-accent-foreground/40",
          )}
        />
        <div
          className={cn(
            "h-1.5 w-20 max-w-full animate-pulse rounded-full",
            surface === "dark"
              ? "bg-background-rich/10"
              : "bg-accent-foreground/20",
          )}
        />
      </div>
      {children && (
        <div className="mt-4 flex flex-wrap items-center gap-3">{children}</div>
      )}
    </div>
  </StateReveal>
);

export namespace FeedbackLoading {
  export type Props = Omit<FeedbackState.Props, "figure"> & {
    figure?: FeedbackState.Props["figure"];
  };
}
