import { cn } from "@zenncore/utils";

type PlusProps = {
  className?: string;
};

export const Plus = ({ className }: PlusProps) => (
  <span
    aria-hidden
    className={cn("pointer-events-none absolute z-10 size-3", className)}
  >
    <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-foreground-dimmed" />
    <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-foreground-dimmed" />
  </span>
);
