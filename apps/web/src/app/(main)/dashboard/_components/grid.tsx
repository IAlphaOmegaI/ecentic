import { cn } from "@zenncore/utils";
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

export const SectionGutter = () => <div className="h-6 bg-grid-stripes" />;

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

export const TopFindingCallout = ({
  label = "Top Finding",
  className,
  children,
}: PropsWithChildren<{ label?: string; className?: string }>) => (
  <div className={cn("bg-primary/5 px-4 py-3", className)}>
    <p className="font-medium text-[10px] text-primary uppercase tracking-[0.08em]">
      {label}
    </p>
    <p className="mt-1 max-w-3xl text-foreground text-sm">{children}</p>
  </div>
);

export const WinRateBadge = ({ rate }: { rate: number }) => (
  <span
    className={cn(
      "whitespace-nowrap rounded px-1.5 py-0.5 font-semibold text-[10px] uppercase tabular-nums tracking-[0.06em]",
      rate >= 50 ? "bg-success/10 text-success" : "bg-error/10 text-error",
    )}
  >
    {rate}% win rate
  </span>
);

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
