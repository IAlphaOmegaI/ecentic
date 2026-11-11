import { getMessages } from "next-intl/server";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { SolutionFeatureBand } from "../feature-band";
import { RetailersCatalogRoutes } from "./retailers-and-marketplaces-catalog";

export const RetailersAndMarketplacesBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { retailersPage } = await getMessages();

  return (
    <>
      {sections.map((section, index) => (
        <Fragment key={section.id}>
          {index > 0 && <SectionGutter />}
          {(() => {
            switch (section.id) {
              case "challenges":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <div className="relative grid grid-cols-[3fr_2fr] bg-background-dimmed max-md:grid-cols-1">
                      <div className="min-w-0 px-8 py-12 max-sm:px-4 max-sm:py-8">
                        <p className="mb-4 text-primary-text text-sm">
                          {section.eyebrow}
                        </p>
                        <h2>{section.title}</h2>
                        <p className="mt-6 max-w-[48ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                          {retailersPage.challengeIntro}
                        </p>
                      </div>
                      <div className="relative min-h-64 border-accent-foreground border-l text-primary-text/80 max-md:h-56 max-md:min-h-0 max-md:border-t max-md:border-l-0">
                        <EvolvingAscii
                          artwork="cart"
                          className="absolute inset-0"
                        />
                      </div>
                      <Plus className="top-0 left-[60%] -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
                      <Plus className="bottom-0 left-[60%] -translate-x-1/2 translate-y-1/2 max-md:hidden" />
                    </div>
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "integrations":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <div className="px-8 py-12 max-sm:px-4 max-sm:py-8">
                      <h2>{section.title}</h2>
                      <p className="mt-6 max-w-[65ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                        {retailersPage.catalogIntro}
                      </p>
                    </div>
                    <RetailersCatalogRoutes
                      items={section.items ?? []}
                      content={retailersPage.catalog}
                    />
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "start":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <div className="relative grid grid-cols-[3fr_2fr] max-md:grid-cols-1">
                      <div className="min-w-0 px-8 py-12 max-sm:px-4 max-sm:py-8">
                        <p className="mb-4 text-primary-text text-sm">
                          {section.eyebrow}
                        </p>
                        <h2>{section.title}</h2>
                        <p className="mt-6 max-w-[48ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                          {section.description}
                        </p>
                        <MarketingActions actions={section.links ?? []} />
                      </div>
                      <div className="min-w-0 border-accent-foreground border-l bg-background-dimmed max-md:border-t max-md:border-l-0">
                        <p className="px-8 pt-8 text-foreground-dimmed text-sm max-sm:px-4">
                          {retailersPage.pilot.label}
                        </p>
                        <ol className="px-8 pb-8 max-sm:px-4">
                          {retailersPage.pilot.steps.map((step, position) => (
                            <li
                              key={step.title}
                              className="grid grid-cols-[32px_1fr] gap-4 border-accent-foreground border-b py-6 last:border-b-0 last:pb-0"
                            >
                              <span
                                aria-hidden
                                className="text-2xl text-primary-text leading-none"
                              >
                                {String(position + 1).padStart(2, "0")}
                              </span>
                              <div>
                                <h3 className="text-xl!">{step.title}</h3>
                                <p className="mt-2 text-foreground-dimmed">
                                  {step.body}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                      <Plus className="top-0 left-[60%] -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
                      <Plus className="bottom-0 left-[60%] -translate-x-1/2 translate-y-1/2 max-md:hidden" />
                    </div>
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "one-product":
                return (
                  <SolutionFeatureBand key={section.id} id={section.id}>
                    <div className="px-4 py-10 sm:px-8 sm:py-12">
                      <p className="mb-4 text-primary-rich text-sm">
                        {section.eyebrow}
                      </p>
                      <h2>{section.title}</h2>
                    </div>
                    {sectionChildren?.[section.id]}
                  </SolutionFeatureBand>
                );
              default:
                return (
                  <MarketingSection section={section}>
                    {sectionChildren?.[section.id]}
                  </MarketingSection>
                );
            }
          })()}
        </Fragment>
      ))}
    </>
  );
};
