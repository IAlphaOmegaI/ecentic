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
import {
  FoodAndBeverageFacts,
  FoodAndBeverageQuestions,
} from "./food-and-beverage-explorer";

export const FoodAndBeverageBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { foodPage, enterpriseSolutions } = await getMessages();
  const facts =
    enterpriseSolutions.sectors["food-and-beverage"].sections.find(
      (section) => section.id === "attributes",
    )?.items ?? [];

  return (
    <>
      {sections.map((section) => {
        switch (section.id) {
          case "questions":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="px-4 py-10 sm:px-8 sm:py-12">
                  <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                  <h2>{section.title}</h2>
                  <p className="mt-4 max-w-[62ch] text-foreground-dimmed text-lg max-sm:text-base">
                    {foodPage.description}
                  </p>
                </div>
                <FoodAndBeverageQuestions
                  questions={section.items ?? []}
                  facts={facts}
                  labels={foodPage}
                />
                {sectionChildren?.[section.id]}
              </MarketingBand>
            );
          case "attributes":
            return (
              <SolutionFeatureBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="px-4 py-10 sm:px-8 sm:py-12">
                  <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                  <h2>{section.title}</h2>
                  <p className="mt-4 max-w-[70ch] text-foreground-dimmed">
                    {section.note}
                  </p>
                </div>
                <FoodAndBeverageFacts label={foodPage.allFacts}>
                  {sectionChildren?.[section.id]}
                </FoodAndBeverageFacts>
              </SolutionFeatureBand>
            );
          case "rules":
            return (
              <Fragment key={section.id}>
                <SectionGutter />
                <MarketingBand
                  id={section.id}
                  className="[&>.marketing-rail>.marketing-guides]:hidden"
                >
                  <div className="px-4 py-10 sm:px-8 sm:py-12">
                    <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                    <h2>{section.title}</h2>
                  </div>
                  <div className="grid gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
                    {section.paragraphs?.map((paragraph, index) => (
                      <div
                        key={paragraph}
                        className="flex min-w-0 flex-col justify-between gap-8 bg-background-dimmed px-4 py-8 sm:px-8"
                      >
                        <p className="max-w-[48ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                          {paragraph}
                        </p>
                        {index === 1 && section.note && (
                          <p className="max-w-[50ch] text-foreground-dimmed text-sm">
                            {section.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  {section.links?.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center justify-between gap-6 border-accent-foreground border-t px-4 py-6 text-primary-text outline-primary-text hover:bg-background-dimmed focus-visible:bg-background-dimmed focus-visible:outline-2 focus-visible:-outline-offset-4 sm:px-8"
                    >
                      <span>{link.label}</span>
                      <ArrowRightIcon aria-hidden className="size-4 shrink-0" />
                    </Link>
                  ))}
                  {sectionChildren?.[section.id]}
                </MarketingBand>
              </Fragment>
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
