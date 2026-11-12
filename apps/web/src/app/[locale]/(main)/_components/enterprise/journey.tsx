import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { AppConfig } from "next-intl";
import { MarketingFeatureBand } from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { JourneyArtwork } from "./journey-artwork";

export const Journey = ({ copy }: Journey.Props) => (
  <MarketingFeatureBand tone="light" className="enterprise-journey-panel">
    <header className="enterprise-stage-list relative border-accent-foreground border-y px-8 py-10 max-sm:px-4 max-sm:py-8">
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <h2 className="max-w-[22ch] font-heading text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.15] tracking-tight">
        {copy.title}
      </h2>
      <p className="mt-4 max-w-[60ch] text-base text-foreground-dimmed leading-relaxed">
        {copy.description}
      </p>
    </header>
    <ol className="relative border-accent-foreground border-b">
      {copy.steps.map((step, index) => (
        <li
          key={step.id}
          data-journey-stage={step.id}
          className="relative grid grid-cols-2 border-accent-foreground border-b last:border-b-0 max-[1000px]:grid-cols-[64px_minmax(0,1fr)]"
        >
          <div
            aria-hidden="true"
            data-journey-axis=""
            className="absolute inset-y-0 left-1/2 z-1 w-px bg-accent-foreground max-[1000px]:left-8"
          />
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Plus className="top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 max-[1000px]:left-8" />
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          {index === copy.steps.length - 1 && (
            <>
              <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
              <Plus className="bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 max-[1000px]:left-8" />
              <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            </>
          )}
          <div
            className={cn(
              "relative row-start-1 flex min-w-0 flex-col justify-center py-12 max-sm:px-4 max-[1000px]:col-start-2 max-[1000px]:px-8 max-[1000px]:pt-8 max-[1000px]:pb-8",
              index % 2 === 0
                ? "col-start-1 bg-linear-to-r from-45% from-transparent to-primary/5 pr-16 pl-8"
                : "col-start-2 bg-linear-to-l from-45% from-transparent to-primary/5 pr-8 pl-16",
            )}
          >
            <h3 className="flex items-center gap-4 font-heading text-2xl text-foreground-rich leading-tight tracking-tight">
              <span className="shrink-0 font-heading text-3xl text-primary tabular-nums leading-none">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{step.title}</span>
            </h3>
            <p className="mt-4 max-w-[40ch] text-base text-foreground-dimmed leading-relaxed">
              {step.body}
            </p>
            <div className="mt-6">
              <Button render={<Link href={step.href} />}>
                {step.label}
                <ArrowRightIcon aria-hidden className="size-4" />
              </Button>
            </div>
          </div>
          <div
            className={cn(
              "relative row-start-1 flex min-w-0 items-center justify-center bg-background-dimmed px-8 py-4 max-sm:px-0 max-[1000px]:col-start-2 max-[1000px]:row-start-2",
              index % 2 === 0 ? "col-start-2" : "col-start-1",
            )}
          >
            <JourneyArtwork stage={step.id} />
          </div>
        </li>
      ))}
    </ol>
  </MarketingFeatureBand>
);

export namespace Journey {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["loop"];
  };
}
