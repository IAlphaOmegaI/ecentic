import type { AppConfig } from "next-intl";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { JourneySteps } from "@/components/marketing/connected-journey";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";

const stages = [
  { icon: "website", figure: "suitcase" },
  { icon: "catalog", figure: "documentStack" },
  { icon: "access", figure: "merchantFolio" },
] as const;

export const TravelAndExperiencesRoadmap = ({
  copy,
}: TravelAndExperiencesRoadmap.Props) => (
  <div
    data-travel-workbench
    className="relative min-w-0 border-background-rich/20 border-y bg-primary-text"
  >
    <MarketingEdgeCrosses />
    <MarketingEdgeCrosses edge="bottom" />
    <JourneySteps
      label={copy.label}
      layout="surface"
      className="border-t-0 [&>li>div:first-child>span:first-child]:from-background-rich/50 [&>li>div:first-child>span:last-child]:border-background-rich/30 [&>li>div:first-child>span:last-child]:bg-primary-text [&>li>div:first-child>span:last-child]:text-background-rich [&>li>div:nth-child(2)_span]:text-background-rich/70 [&>li]:border-background-rich/20"
      items={copy.stages.map((stage, index) => ({
        id: stage.id,
        title: stage.label,
        icon: stages[index]?.icon ?? "website",
        content: (
          <>
            <div className="grid min-w-0 border-background-rich/20 border-b md:grid-cols-2">
              <div className="flex min-w-0 flex-col justify-center px-4 py-8 sm:px-8">
                <p className="text-background-rich/75 text-sm">
                  {stage.status}
                </p>
                <h4 className="mt-4 max-w-[24ch] font-heading text-3xl text-background-rich">
                  {stage.title}
                </h4>
                <p className="mt-4 max-w-[48ch] text-background-rich/85 leading-relaxed">
                  {stage.description}
                </p>
              </div>
              <div className="min-w-0 self-center">
                <CommerceFigure
                  kind={stages[index]?.figure ?? "suitcase"}
                  surface="dark"
                  className="mx-auto aspect-[4/3] max-w-[400px] bg-primary-text [--hairline-hi:var(--color-background-rich)] [--hairline-plate:var(--color-primary-text)]"
                />
              </div>
            </div>
            <dl className="px-4 sm:px-8">
              {stage.steps.map((step) => (
                <div
                  key={step.title}
                  className="grid gap-4 border-background-rich/20 border-b py-6 last:border-b-0 sm:grid-cols-[1fr_2fr] sm:gap-8"
                >
                  <dt className="font-medium text-background-rich text-sm">
                    {step.title}
                  </dt>
                  <dd className="text-background-rich/85 text-sm leading-relaxed">
                    {step.body}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="grid gap-4 border-background-rich/20 border-t px-4 py-6 sm:grid-cols-[1fr_2fr] sm:gap-8 sm:px-8">
              <p className="font-medium text-background-rich text-sm">
                {copy.boundary}
              </p>
              <p className="text-background-rich/75 text-sm leading-relaxed">
                {stage.note}
              </p>
            </div>
          </>
        ),
      }))}
    />
  </div>
);

export namespace TravelAndExperiencesRoadmap {
  export type Props = { copy: AppConfig["Messages"]["travelPage"]["roadmap"] };
}
