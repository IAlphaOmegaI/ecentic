import { ArrowRightIcon } from "@zenncore/icons";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingBand,
  MarketingEyebrow,
} from "@/components/marketing/primitives";
import { Link } from "@/i18n/navigation";
import { SectorRules } from "../sector-rules";
import { SectorAttributes, SectorQuestions } from "../sector-sections";

export const FoodAndBeverageBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  return (
    <>
      {sections.map((section) => {
        switch (section.id) {
          case "questions":
            return (
              <SectorQuestions
                key={section.id}
                section={section}
                sector="food-and-beverage"
              >
                {sectionChildren?.[section.id]}
              </SectorQuestions>
            );
          case "attributes":
            return (
              <SectorAttributes
                key={section.id}
                section={section}
                sector="food-and-beverage"
              >
                {sectionChildren?.[section.id]}
              </SectorAttributes>
            );
          case "rules":
            return (
              <SectorRules
                key={section.id}
                section={section}
                sector="food-and-beverage"
              />
            );
          case "business":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="px-4 py-10 sm:px-8 sm:py-12">
                  <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                  <h2>{section.title}</h2>
                </div>
                <div className="border-accent-foreground border-t">
                  {section.items?.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href ?? "/solutions"}
                      className="group grid grid-cols-[1fr_auto] items-start gap-x-6 gap-y-4 border-accent-foreground border-b px-4 py-8 outline-primary-text last:border-b-0 hover:bg-background-dimmed focus-visible:bg-background-dimmed focus-visible:outline-2 focus-visible:-outline-offset-4 sm:px-8 md:grid-cols-[1.1fr_1fr_auto]"
                    >
                      <h3 className="max-w-[25ch] text-2xl! group-hover:text-primary-text">
                        {item.title}
                      </h3>
                      <p className="col-start-1 max-w-[42ch] text-foreground-dimmed md:col-start-auto">
                        {item.body}
                      </p>
                      <span className="col-start-1 inline-flex items-center gap-4 text-primary-text text-sm md:col-start-auto">
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
