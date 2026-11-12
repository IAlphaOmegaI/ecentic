import { ArrowRightIcon } from "@zenncore/icons";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingBand,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { Link } from "@/i18n/navigation";
import { SectorRules } from "../sector-rules";
import { SectorAttributes, SectorQuestions } from "../sector-sections";

export const ConsumerElectronicsBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  return (
    <>
      {sections.map((section) => {
        switch (section.id) {
          case "rules":
            return (
              <SectorRules
                key={section.id}
                section={section}
                sector="consumer-electronics"
              />
            );
          case "questions":
            return (
              <SectorQuestions
                key={section.id}
                section={section}
                sector="consumer-electronics"
              >
                {sectionChildren?.[section.id]}
              </SectorQuestions>
            );
          case "attributes":
            return (
              <SectorAttributes
                key={section.id}
                section={section}
                sector="consumer-electronics"
              >
                {sectionChildren?.[section.id]}
              </SectorAttributes>
            );
          case "business":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <SectionGutter />
                <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
                  <MarketingHeading title={section.title} />
                  <div className="border-accent-foreground border-t lg:border-t-0 lg:border-l">
                    {section.items?.map((item) => (
                      <article
                        key={item.title}
                        className="border-accent-foreground border-b last:border-b-0"
                      >
                        {item.href ? (
                          <Link
                            href={item.href}
                            className="group block bg-background-dimmed p-4 transition-colors hover:bg-background focus-visible:bg-background sm:p-8"
                          >
                            <div className="flex items-start justify-between gap-6">
                              <h3 className="group-hover:text-primary-text group-focus-visible:text-primary-text">
                                {item.title}
                              </h3>
                              <ArrowRightIcon
                                aria-hidden="true"
                                className="mt-2 size-4 shrink-0 text-primary"
                              />
                            </div>
                            <p className="mt-4 max-w-[48ch] text-foreground-dimmed">
                              {item.body}
                            </p>
                            <span className="mt-4 block text-primary-text text-sm">
                              {item.label ?? item.title}
                            </span>
                          </Link>
                        ) : (
                          <div className="p-4 sm:p-8">
                            <h3>{item.title}</h3>
                            <p className="mt-4 text-foreground-dimmed">
                              {item.body}
                            </p>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
                {sectionChildren?.[section.id]}
              </MarketingBand>
            );
          default:
            return (
              <MarketingSection key={section.id} section={section}>
                {sectionChildren?.[section.id]}
              </MarketingSection>
            );
        }
      })}
    </>
  );
};
