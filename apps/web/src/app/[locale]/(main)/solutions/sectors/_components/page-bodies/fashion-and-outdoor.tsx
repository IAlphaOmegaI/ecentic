import { ArrowRightIcon } from "@zenncore/icons";
import { getMessages } from "next-intl/server";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingBand,
  MarketingEyebrow,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { SolutionFeatureBand } from "../../../_components/feature-band";
import { SectorRules } from "../sector-rules";
import { FashionAndOutdoorTrail } from "./fashion-and-outdoor-trail";

export const FashionAndOutdoorBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { enterpriseSolutions, fashionPage } = await getMessages();
  const attributes =
    enterpriseSolutions.sectors["fashion-and-outdoor"].sections.find(
      (section) => section.id === "attributes",
    )?.items ?? [];

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
                    <FashionAndOutdoorTrail
                      questions={section.items ?? []}
                      attributes={attributes}
                      copy={fashionPage.trail}
                    />
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "rules":
                return (
                  <SectorRules
                    key={section.id}
                    section={section}
                    sector="fashion-and-outdoor"
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
                    <div className="grid border-accent-foreground border-t md:grid-cols-2">
                      {section.items?.map((item, position) => (
                        <Link
                          key={item.title}
                          href={item.href ?? "/solutions"}
                          className="group relative flex min-w-0 flex-col border-accent-foreground px-4 py-8 hover:bg-background-dimmed focus-visible:-outline-offset-4 max-md:not-first:border-t sm:px-8 md:nth-[n+3]:border-t md:odd:border-r"
                        >
                          {position === 3 && (
                            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
                          )}
                          <h3 className="max-w-[24ch] text-2xl! group-hover:text-primary-text">
                            {item.title}
                          </h3>
                          <p className="mt-4 max-w-[42ch] text-foreground-dimmed">
                            {item.body}
                          </p>
                          <span className="mt-6 flex items-center justify-between gap-4 text-primary-text text-sm">
                            {item.label}
                            <ArrowRightIcon
                              aria-hidden
                              className="size-4 shrink-0"
                            />
                          </span>
                        </Link>
                      ))}
                    </div>
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "attributes":
                return (
                  <SolutionFeatureBand id={section.id}>
                    <div className="px-4 py-10 sm:px-8 sm:py-12">
                      {section.eyebrow && (
                        <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                      )}
                      <h2>{section.title}</h2>
                      {section.description && (
                        <p className="mt-4 max-w-[60ch] text-background-rich/75">
                          {section.description}
                        </p>
                      )}
                    </div>
                    {sectionChildren?.[section.id]}
                    {section.note && (
                      <p className="border-background-rich/15 border-t px-4 py-6 text-background-rich/65 text-sm sm:px-8">
                        {section.note}
                      </p>
                    )}
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
