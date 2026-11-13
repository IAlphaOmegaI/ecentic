import { cn } from "@zenncore/utils";
import documentStack from "@/components/hairline/rest/document-stack.json";
import headphones from "@/components/hairline/rest/headphones.json";
import scanner from "@/components/hairline/rest/readiness-scanner.json";
import shoppingBot from "@/components/hairline/rest/shopping-bot.json";
import "@/components/hairline/kernel-style.css";
import "./onboarding-roadmap.css";

const figures = [
  { geometry: documentStack, viewBox: "66 89 250 161" },
  { geometry: headphones, viewBox: "86 43 220 253" },
  { geometry: shoppingBot, viewBox: "52 64 306 205" },
  { geometry: scanner, viewBox: "66 51 268 261" },
] as const;

/** The same validated commerce objects form one route, without independent canvases or idle loops. */
export const OnboardingRoadmapFigure = ({
  index,
  active = false,
  className,
}: {
  index: number;
  active?: boolean;
  className?: string;
}) => (
  <div
    aria-hidden="true"
    data-hairline="onboarding-roadmap"
    data-hairline-theme="light"
    className={cn(
      "relative aspect-auto h-16 w-28 shrink-0 [--hairline-edge:var(--color-foreground-dimmed)] [--hairline-hi:var(--color-foreground)] [--hairline-lo:var(--color-accent-foreground)] [--hairline-mid:var(--color-foreground-dimmed)] [--hairline-plate:var(--color-background-rich)] [--hairline-stroke:0.9]",
      active &&
        "[--hairline-edge:var(--color-primary-text)] [--hairline-hi:var(--color-primary-text)] [--hairline-mid:var(--color-primary)]",
      className,
    )}
  >
    <svg
      aria-hidden="true"
      viewBox={(figures[index] ?? figures[0]).viewBox}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Existing validated local Hairline rest geometry, never user content.
      dangerouslySetInnerHTML={{
        __html: (figures[index] ?? figures[0]).geometry,
      }}
    />
  </div>
);

export const OnboardingRoadmap = ({
  steps,
  current,
}: OnboardingRoadmap.Props) => (
  <ol className="relative grid grid-cols-4 px-6 pb-2 md:px-8">
    {steps.map((step, index) => {
      const reached = index <= current;
      const active = index === current;
      return (
        <li
          key={step.path}
          aria-current={active ? "step" : undefined}
          className="relative flex min-w-0 flex-col items-center"
        >
          <div className="hidden md:block">
            <OnboardingRoadmapFigure index={index} active={reached} />
          </div>
          <div className="relative flex h-4 w-full items-center justify-center">
            {index < steps.length - 1 && (
              <svg
                aria-hidden="true"
                viewBox="0 0 100 20"
                preserveAspectRatio="none"
                className="pointer-events-none absolute top-0 left-1/2 h-4 w-full overflow-visible"
              >
                <path
                  d="M0 10 C25 10 25 3 50 3 S75 10 100 10"
                  fill="none"
                  className={
                    index < current
                      ? "stroke-primary"
                      : "stroke-accent-foreground"
                  }
                  strokeWidth="1"
                  strokeDasharray={index < current ? undefined : "2 4"}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-1 grid size-3 place-items-center rounded-full border",
                reached
                  ? "border-primary bg-primary"
                  : "border-accent-foreground bg-background-rich",
                active && "ring-4 ring-primary/15",
              )}
            >
              {index < current && (
                <span className="size-1 rounded-full bg-background-rich" />
              )}
            </span>
          </div>
          <span
            className={cn(
              "px-2 text-center text-sm leading-snug max-md:sr-only",
              active
                ? "font-semibold text-foreground-rich"
                : "font-medium text-foreground-dimmed",
            )}
          >
            {step.label}
          </span>
        </li>
      );
    })}
  </ol>
);

export namespace OnboardingRoadmap {
  export type Props = {
    steps: readonly { path: string; label: string }[];
    current: number;
  };
}
