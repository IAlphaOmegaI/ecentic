import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { AppConfig } from "next-intl";
import { MarketingBand } from "@/components/marketing/primitives";
import { Link } from "@/i18n/navigation";
import { JourneyArtwork } from "./journey-artwork";

export const Journey = ({ copy }: Journey.Props) => (
  <MarketingBand className="enterprise-journey-panel bg-background [&_.marketing-guides]:hidden">
    <header className="enterprise-stage-list border-accent-foreground border-b px-8 py-10 max-sm:px-4 max-sm:py-8">
      <h2 className="max-w-[22ch] font-heading text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.15] tracking-tight">
        {copy.title}
      </h2>
      <p className="mt-4 max-w-[60ch] text-base text-foreground-dimmed leading-relaxed">
        {copy.description}
      </p>
    </header>
    <ol className="relative px-8 py-8 max-sm:px-4 max-sm:py-4">
      {copy.steps.map((step, index) => (
        <li
          key={step.id}
          data-journey-stage={step.id}
          className="group relative grid grid-cols-[minmax(0,1fr)_80px_minmax(0,1fr)] items-center max-[1000px]:grid-cols-[40px_minmax(0,1fr)]"
        >
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-1/2 w-px bg-primary/25 group-first:top-1/2 group-last:bottom-1/2 max-[1000px]:left-4 max-[1000px]:group-last:bottom-auto max-[1000px]:group-last:h-12 max-[1000px]:group-first:top-12"
          />
          <div className="relative col-start-2 row-start-1 grid place-items-center self-stretch max-[1000px]:col-start-1 max-[1000px]:row-span-2 max-[1000px]:items-start max-[1000px]:justify-items-start max-[1000px]:pt-8">
            <span className="relative z-1 grid size-10 place-items-center border border-primary/30 bg-background font-medium text-primary text-sm tabular-nums max-[1000px]:size-8">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>
          <div
            className={cn(
              "relative row-start-1 min-w-0 py-10 max-[1000px]:col-start-2 max-[1000px]:pt-8 max-[1000px]:pb-2",
              index % 2 === 0 ? "col-start-1 pr-6" : "col-start-3 pl-6",
              "max-[1000px]:px-0",
            )}
          >
            <h3 className="font-heading text-2xl text-foreground-rich leading-tight tracking-tight">
              {step.title}
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
              "relative row-start-1 min-w-0 max-[1000px]:col-start-2 max-[1000px]:row-start-2",
              index % 2 === 0 ? "col-start-3" : "col-start-1",
            )}
          >
            <JourneyArtwork stage={step.id} />
          </div>
        </li>
      ))}
    </ol>
  </MarketingBand>
);

export namespace Journey {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["loop"];
  };
}
