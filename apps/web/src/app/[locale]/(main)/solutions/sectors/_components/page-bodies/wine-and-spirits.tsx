import { ArrowRightIcon } from "@zenncore/icons";
import { getMessages } from "next-intl/server";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingBand,
  MarketingEyebrow,
} from "@/components/marketing/primitives";
import { Link } from "@/i18n/navigation";
import { SolutionFeatureBand } from "../../../_components/feature-band";
import { SectorRules } from "../sector-rules";
import { WineAndSpiritsQuestions } from "./wine-and-spirits-questions";

export const WineAndSpiritsBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { winePage, sectorReview } = await getMessages();

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
                      <p className="mt-4 max-w-[62ch] text-foreground-dimmed">
                        {sectorReview.questions.subtitle}
                      </p>
                    </div>
                    <WineAndSpiritsQuestions
                      items={section.items ?? []}
                      labels={winePage.explorer}
                    />
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "attributes":
                return (
                  <SolutionFeatureBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <div className="relative grid md:grid-cols-[2fr_1fr]">
                      <div className="flex min-w-0 flex-col justify-center px-4 py-8 sm:px-8 sm:py-12">
                        {section.eyebrow && (
                          <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                        )}
                        <h2>{section.title}</h2>
                        <p className="mt-4 max-w-[48ch] text-foreground-dimmed text-lg max-sm:text-base">
                          {winePage.attributes.description}
                        </p>
                      </div>
                      <figure className="m-0 flex min-w-0 flex-col border-accent-foreground bg-emphasis-dimmed max-md:border-t md:border-l">
                        <div className="relative h-52 min-h-52 flex-1 text-primary-text sm:min-h-64">
                          <CommerceFigure
                            kind="document"
                            surface="dark"
                            className="absolute inset-0 aspect-auto size-full"
                          />
                        </div>
                        <figcaption className="border-accent-foreground border-t px-4 py-4 text-foreground-dimmed text-sm sm:px-8">
                          {winePage.attributes.caption}
                        </figcaption>
                      </figure>
                    </div>
                    <div className="bg-background-dimmed/50">
                      {sectionChildren?.[section.id]}
                    </div>
                    {section.note && (
                      <p className="border-accent-foreground border-t px-4 py-6 text-foreground-dimmed text-sm sm:px-8">
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
                    sector="wine-and-spirits"
                  />
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
                        className="group grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-4 border-accent-foreground border-t px-4 py-6 hover:bg-background-dimmed focus-visible:-outline-offset-4 sm:px-8 md:grid-cols-[1.1fr_1fr_auto]"
                      >
                        <h3 className="text-2xl! group-hover:text-primary-text">
                          {item.title}
                        </h3>
                        <p className="text-foreground-dimmed max-md:col-start-1 max-md:row-start-2">
                          {item.body}
                        </p>
                        <span className="flex items-center gap-4 text-primary-text max-md:row-span-2 max-md:row-start-1">
                          <span className="hidden text-sm lg:inline">
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
