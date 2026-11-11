import { ArrowRightIcon } from "@zenncore/icons";
import { getMessages } from "next-intl/server";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import {
  type MarketingPage,
  MarketingSection,
} from "@/components/marketing/page";
import {
  MarketingBand,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { Link } from "@/i18n/navigation";
import {
  ElectronicsSpecification,
  ElectronicsWorkbench,
} from "./consumer-electronics-workbench";

export const ConsumerElectronicsBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { electronicsPage, enterpriseSolutions } = await getMessages();
  const attributes: MarketingPage.Section | undefined =
    enterpriseSolutions.sectors["consumer-electronics"].sections.find(
      (section) => section.id === "attributes",
    );
  const specifications = attributes?.items ?? [];

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
                <MarketingHeading title={section.title} />
                <ElectronicsWorkbench
                  questions={section.items ?? []}
                  specifications={specifications}
                  copy={electronicsPage}
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
                <ElectronicsSpecification label={electronicsPage.mapLabel}>
                  {sectionChildren?.[section.id]}
                </ElectronicsSpecification>
                {section.note && (
                  <p className="border-accent-foreground border-t bg-background-dimmed px-4 py-6 text-foreground-dimmed text-sm sm:px-8">
                    {section.note}
                  </p>
                )}
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
