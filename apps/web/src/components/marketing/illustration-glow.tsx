import { cn } from "@zenncore/utils";

/** The light reaches transparency inside its plane, before a clipping boundary. */
export const IllustrationGlow = ({ className }: { className?: string }) => (
  <div
    aria-hidden
    data-illustration-glow
    className={cn(
      "pointer-events-none absolute inset-0 -z-1 bg-[radial-gradient(ellipse_48%_46%_at_50%_52%,color-mix(in_oklab,var(--color-primary)_22%,transparent)_0%,color-mix(in_oklab,var(--color-primary)_8%,transparent)_42%,transparent_100%)]",
      className,
    )}
  />
);
