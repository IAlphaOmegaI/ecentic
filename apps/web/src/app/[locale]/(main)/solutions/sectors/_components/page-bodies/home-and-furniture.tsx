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

export const HomeAndFurnitureBody = async ({
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
                sector="home-and-furniture"
              />
            );
          case "questions":
            return (
              <SectorQuestions
                key={section.id}
                section={section}
                sector="home-and-furniture"
              >
                {sectionChildren?.[section.id]}
              </SectorQuestions>
            );
          case "attributes":
            return (
              <SectorAttributes
                key={section.id}
                section={section}
                sector="home-and-furniture"
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
                <MarketingHeading title={section.title} />
                <div className="grid gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
                  {section.items?.map((item) => (
                    <article key={item.title} className="bg-background">
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="group flex h-full flex-col p-4 transition-colors hover:bg-background-dimmed focus-visible:bg-background-dimmed sm:p-8"
                        >
                          <h3 className="max-w-[24ch] group-hover:text-primary-text group-focus-visible:text-primary-text">
                            {item.title}
                          </h3>
                          <p className="mt-4 max-w-[45ch] text-foreground-dimmed">
                            {item.body}
                          </p>
                          <span className="mt-8 flex items-center justify-between gap-4 text-primary-text text-sm">
                            {item.label ?? item.title}
                            <ArrowRightIcon
                              aria-hidden="true"
                              className="size-4"
                            />
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
