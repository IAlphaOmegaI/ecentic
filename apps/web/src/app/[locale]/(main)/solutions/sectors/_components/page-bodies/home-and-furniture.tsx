import { ArrowRightIcon } from "@zenncore/icons";
import { getMessages } from "next-intl/server";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingBand,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { FurnitureQuestions } from "./home-and-furniture-questions";

export const HomeAndFurnitureBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { furniturePage, enterpriseSolutions } = await getMessages();
  const specifications =
    enterpriseSolutions.sectors["home-and-furniture"].sections.find(
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
                <MarketingHeading
                  title={section.title}
                  description={furniturePage.introduction}
                />
                <FurnitureQuestions
                  questions={section.items ?? []}
                  specifications={specifications}
                  copy={furniturePage}
                />
                {sectionChildren?.[section.id]}
              </MarketingBand>
            );
          case "attributes":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <SectionGutter />
                <MarketingHeading
                  title={section.title}
                  description={section.description}
                />
                <div className="relative grid border-accent-foreground border-t bg-background-dimmed md:grid-cols-[1fr_2fr]">
                  <div className="relative flex items-center border-accent-foreground border-b px-4 py-6 sm:px-8 md:border-r md:border-b-0">
                    <p className="text-foreground-rich text-xl">
                      {furniturePage.sourceLabel}
                    </p>
                    <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:block" />
                  </div>
                  {section.note && (
                    <p className="max-w-[70ch] px-4 py-6 text-foreground-dimmed sm:px-8">
                      {section.note}
                    </p>
                  )}
                </div>
                {sectionChildren?.[section.id]}
              </MarketingBand>
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
