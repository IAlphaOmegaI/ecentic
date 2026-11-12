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
import { Link } from "@/i18n/navigation";
import { SolutionFeatureBand } from "../../../_components/feature-band";
import { SectorRules } from "../sector-rules";
import { HealthWellnessAndPetReader } from "./health-wellness-and-pet-reader";

export const HealthWellnessAndPetBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { enterpriseSolutions, healthPage } = await getMessages();
  const attributes =
    enterpriseSolutions.sectors["health-wellness-and-pet"].sections.find(
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
                      <p className="mt-4 max-w-[60ch] text-foreground-dimmed">
                        {healthPage.reader.description}
                      </p>
                    </div>
                    <HealthWellnessAndPetReader
                      questions={section.items ?? []}
                      attributes={attributes}
                      copy={healthPage.reader}
                    />
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
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
