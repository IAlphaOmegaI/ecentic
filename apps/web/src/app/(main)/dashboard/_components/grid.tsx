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

export const SectionGutter = () => (
  <div className="relative h-10 bg-grid-stripes">
    <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
    <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
    <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
    <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
  </div>
);

export const ClosingGutter = () => (
  <div className="relative h-12 bg-grid-stripes">
    <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
    <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
  </div>
);

export const SectionKicker = ({ children }: PropsWithChildren) => (
  <p className="flex items-center gap-2 text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
    <span className="size-1.5 bg-primary" />
    {children}
  </p>
);

export const StatLabel = ({
  label,
  icon,
}: {
  label: string;
  icon: ReactNode;
}) => (
  <div className="flex items-center justify-between gap-2">
    <p className="pr-12 text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
      {label}
    </p>
    <span className="absolute top-5 right-5">{icon}</span>
  </div>
);
