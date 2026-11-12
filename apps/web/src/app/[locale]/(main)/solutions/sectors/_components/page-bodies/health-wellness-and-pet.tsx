import { ArrowRightIcon } from "@zenncore/icons";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingBand,
  MarketingEyebrow,
} from "@/components/marketing/primitives";
import { Link } from "@/i18n/navigation";
import { SectorRules } from "../sector-rules";
import { SectorAttributes, SectorQuestions } from "../sector-sections";

export const HealthWellnessAndPetBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
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
                    sector="health-wellness-and-pet"
                  >
                    {sectionChildren?.[section.id]}
                  </SectorQuestions>
                );
              case "rules":
                return (
                  <SectorRules
                    key={section.id}
                    section={section}
                    sector="health-wellness-and-pet"
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
                        className="group grid min-w-0 items-center gap-4 border-accent-foreground border-t px-4 py-8 hover:bg-background-dimmed focus-visible:-outline-offset-4 sm:px-8 md:grid-cols-[2fr_2fr_1fr] md:gap-8"
                      >
                        <h3 className="max-w-[26ch] text-2xl! group-hover:text-primary-text">
                          {item.title}
                        </h3>
                        <p className="max-w-[40ch] text-foreground-dimmed">
                          {item.body}
                        </p>
                        <span className="flex items-center justify-between gap-4 text-primary-text text-sm">
                          {item.label}
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
              case "attributes":
                return (
                  <SectorAttributes
                    key={section.id}
                    section={section}
                    sector="health-wellness-and-pet"
                  >
                    {sectionChildren?.[section.id]}
                  </SectorAttributes>
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
