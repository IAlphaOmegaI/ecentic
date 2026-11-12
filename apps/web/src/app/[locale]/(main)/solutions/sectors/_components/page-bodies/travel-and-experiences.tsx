import { ArrowRightIcon } from "@zenncore/icons";
import { getMessages } from "next-intl/server";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
  MarketingEyebrow,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { SolutionFeatureBand } from "../../../_components/feature-band";
import { SectorRules } from "../sector-rules";
import { TravelAndExperiencesRoadmap } from "./travel-and-experiences-roadmap";

export const TravelAndExperiencesBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { travelPage } = await getMessages();

  return (
    <>
      {sections.map((section, index) => (
        <Fragment key={section.id}>
          {index > 0 && <SectionGutter />}
          {(() => {
            switch (section.id) {
              case "questions":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <div className="px-4 py-8 sm:px-8 sm:py-12">
                      {section.eyebrow && (
                        <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                      )}
                      <h2>{section.title}</h2>
                    </div>
                    <div className="relative grid border-accent-foreground border-t md:grid-cols-[1fr_2fr]">
                      <Plus className="top-0 left-1/3 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
                      <figure className="m-0 flex min-w-0 flex-col justify-between bg-background-dimmed max-md:border-accent-foreground max-md:border-b md:border-accent-foreground md:border-r">
                        <div className="relative h-64 min-h-64 flex-1 text-primary-text sm:min-h-72">
                          <EvolvingAscii
                            artwork="bag"
                            className="absolute inset-0"
                          />
                        </div>
                        <figcaption className="px-4 pb-8 sm:px-8">
                          <p className="font-medium text-foreground-rich">
                            {travelPage.questions.caption}
                          </p>
                          <p className="mt-2 text-foreground-dimmed text-sm">
                            {travelPage.questions.description}
                          </p>
                        </figcaption>
                      </figure>
                      <ol className="min-w-0">
                        {section.items?.map((item, position) => (
                          <li
                            key={item.title}
                            className="grid grid-cols-[32px_1fr] gap-4 border-accent-foreground border-b px-4 py-8 last:border-b-0 sm:grid-cols-[48px_1fr] sm:gap-8 sm:px-8"
                          >
                            <span
                              aria-hidden
                              className="font-superior text-3xl text-primary-text"
                            >
                              {String(position + 1).padStart(2, "0")}
                            </span>
                            <div className="min-w-0">
                              <h3 className="max-w-[32ch] text-2xl!">
                                {item.title}
                              </h3>
                              <p className="mt-4 max-w-[58ch] text-foreground-dimmed text-sm!">
                                {item.body}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "attributes":
                return (
                  <SolutionFeatureBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <div className="px-4 py-8 sm:px-8 sm:py-12">
                      {section.eyebrow && (
                        <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                      )}
                      <h2>{section.title}</h2>
                      <p className="mt-4 max-w-[60ch] text-foreground-dimmed text-lg max-sm:text-base">
                        {travelPage.attributes.description}
                      </p>
                    </div>
                    <div className="bg-background-dimmed/60">
                      {sectionChildren?.[section.id]}
                    </div>
                    {section.note && (
                      <p className="border-accent-foreground border-t px-4 py-6 text-foreground-dimmed text-sm! sm:px-8">
                        {section.note}
                      </p>
                    )}
                  </SolutionFeatureBand>
                );
              case "rules":
                return (
                  <SectorRules
                    key={section.id}
                    section={section}
                    sector="travel-and-experiences"
                  />
                );
              case "pilot":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <div className="px-4 py-8 sm:px-8 sm:py-12">
                      <h2>{section.title}</h2>
                      {section.description && (
                        <p className="mt-4 max-w-[64ch] text-foreground-dimmed text-lg max-sm:text-base">
                          {section.description}
                        </p>
                      )}
                    </div>
                    <TravelAndExperiencesRoadmap copy={travelPage.roadmap} />
                    {sectionChildren?.[section.id]}
                    {section.links && (
                      <div className="border-accent-foreground border-t px-4 py-6 sm:px-8">
                        <MarketingActions
                          actions={section.links}
                          className="mt-0"
                        />
                      </div>
                    )}
                  </MarketingBand>
                );
              case "business":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <div className="px-4 py-8 sm:px-8 sm:py-12">
                      {section.eyebrow && (
                        <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                      )}
                      <h2>{section.title}</h2>
                    </div>
                    {section.items?.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href ?? "/solutions"}
                        className="group grid grid-cols-[1fr_auto] items-center gap-x-8 gap-y-4 border-accent-foreground border-t px-4 py-6 hover:bg-background-dimmed focus-visible:-outline-offset-4 sm:px-8 md:grid-cols-[1.1fr_1fr_auto]"
                      >
                        <h3 className="text-2xl! group-hover:text-primary-text">
                          {item.title}
                        </h3>
                        <p className="col-start-1 text-foreground-dimmed text-sm! md:col-start-auto">
                          {item.body}
                        </p>
                        <span className="col-start-2 row-span-2 row-start-1 flex items-center gap-4 text-primary-text md:col-start-auto md:row-span-1 md:row-start-auto">
                          <span className="hidden text-sm group-hover:underline md:inline">
                            {item.label}
                          </span>
                          <ArrowRightIcon
                            aria-hidden
                            className="size-4 shrink-0"
                          />
                        </span>
                      </Link>
                    ))}
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
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
