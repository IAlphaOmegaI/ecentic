"use client";

import { cn } from "@zenncore/utils";
import {
  Tooltip,
  TooltipPopup,
  TooltipPositioner,
  TooltipProvider,
  TooltipTrigger,
} from "@zenncore/web/components/tooltip";
import { useFormatter } from "next-intl";

/** Measured counts on a shared scale, following ecentic's hairline chart grammar. */
export const Measurements = ({ entries, label }: Measurements.Props) => {
  const format = useFormatter();
  const maximum = Math.max(1, ...entries.map(({ value }) => value ?? 0));
  const ticks = maximum > 1 ? [0, Math.ceil(maximum / 2), maximum] : [0, 1];

  return (
    <figure aria-label={label} className="min-w-0">
      <TooltipProvider delay={100}>
        <div className="relative pl-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-40 pl-8"
          >
            {ticks.map((tick) => (
              <div
                key={tick}
                className="absolute right-0 left-8 border-accent-foreground border-t"
                style={{ bottom: `${(tick / maximum) * 100}%` }}
              >
                <span className="absolute right-full mr-2 -translate-y-1/2 text-foreground-dimmed text-xs tabular-nums">
                  {format.number(tick, { maximumFractionDigits: 1 })}
                </span>
              </div>
            ))}
          </div>
          <div
            className="relative grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${entries.length}, minmax(0, 1fr))`,
            }}
          >
            {entries.map(({ key, label: title, value }, index) => (
              <Tooltip key={key}>
                <TooltipTrigger
                  className="group h-auto w-full min-w-0 flex-col justify-start gap-2 px-2 py-0"
                  aria-label={`${title}: ${value === null ? "—" : format.number(value)}`}
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 100 160"
                    preserveAspectRatio="none"
                    className="h-40 w-full overflow-visible"
                  >
                    {value !== null && value > 0 && (
                      <rect
                        data-measured-value={value}
                        data-measured-maximum={maximum}
                        x="24"
                        y={160 - (value / maximum) * 160}
                        width="52"
                        height={(value / maximum) * 160}
                        vectorEffect="non-scaling-stroke"
                        className={cn(
                          "transition-colors duration-150 group-data-popup-open:fill-primary/12 group-data-popup-open:stroke-primary motion-reduce:transition-none",
                          index === 0
                            ? "fill-primary/8 stroke-primary"
                            : "fill-background-rich stroke-foreground-dimmed/70",
                        )}
                      />
                    )}
                  </svg>
                  <strong className="mt-2 font-heading font-semibold text-2xl text-foreground-rich tabular-nums">
                    {value === null ? "—" : format.number(value)}
                  </strong>
                  <span className="min-w-0 break-words text-center text-foreground-dimmed text-xs leading-4">
                    {title}
                  </span>
                </TooltipTrigger>
                <TooltipPositioner side="top" sideOffset={8}>
                  <TooltipPopup className="rounded-lg border-background-rich/15 bg-emphasis px-4 py-2 text-background-rich shadow-sm motion-reduce:transition-none">
                    <span className="text-background-rich/70 text-xs">
                      {title}
                    </span>
                    <strong className="font-semibold text-lg tabular-nums">
                      {value === null ? "—" : format.number(value)}
                    </strong>
                  </TooltipPopup>
                </TooltipPositioner>
              </Tooltip>
            ))}
          </div>
        </div>
      </TooltipProvider>
    </figure>
  );
};

export namespace Measurements {
  export type Props = {
    label: string;
    entries: readonly {
      key: string;
      label: string;
      value: number | null;
    }[];
  };
}
