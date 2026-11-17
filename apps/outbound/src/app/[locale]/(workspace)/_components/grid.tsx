import { cn } from "@zenncore/utils";

/** The shared ecentic hairline mark, kept local to this app's structural seams. */
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
