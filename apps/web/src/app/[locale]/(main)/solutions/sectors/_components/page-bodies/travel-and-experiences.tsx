import { ArrowRightIcon } from "@zenncore/icons";
import { getMessages } from "next-intl/server";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
  MarketingEyebrow,
  MarketingFeatureBand,
} from "@/components/marketing/primitives";
import { Link } from "@/i18n/navigation";
import { SectorRules } from "../sector-rules";
import { SectorAttributes, SectorQuestions } from "../sector-sections";
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
                  <SectorQuestions
                    key={section.id}
                    section={section}
                    sector="travel-and-experiences"
                  >
                    {sectionChildren?.[section.id]}
                  </SectorQuestions>
                );
              case "attributes":
                return (
                  <SectorAttributes
                    key={section.id}
                    section={section}
                    sector="travel-and-experiences"
                  >
                    {sectionChildren?.[section.id]}
                  </SectorAttributes>
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
                  <MarketingFeatureBand
                    tone="blue"
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <div className="px-4 py-8 sm:px-8 sm:py-12">
                      <h2>{section.title}</h2>
                      {section.description && (
                        <p className="mt-4 max-w-[64ch] text-background-rich/85 text-lg max-sm:text-base">
                          {section.description}
                        </p>
                      )}
                    </div>
                    <TravelAndExperiencesRoadmap copy={travelPage.roadmap} />
                    {sectionChildren?.[section.id]}
                    {section.links && (
                      <div className="border-background-rich/20 border-t px-4 py-6 sm:px-8">
                        <MarketingActions
                          actions={section.links}
                          className="mt-0"
                        />
                      </div>
                    )}
                  </MarketingFeatureBand>
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
