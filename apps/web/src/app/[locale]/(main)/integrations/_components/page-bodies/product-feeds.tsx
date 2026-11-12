import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { JourneySteps } from "@/components/marketing/connected-journey";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingBand,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { IntegrationWorkflow } from "../integration-workflow";
import { ProductFeedsFormats } from "./product-feeds-formats";

export const ProductFeedsBody = ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => (
  <>
    {sections.map((section) => {
      const children = sectionChildren?.[section.id];
      const body = (() => {
        switch (section.id) {
          case "workflow":
            return (
              <IntegrationWorkflow section={section} integration="productFeeds">
                {children}
              </IntegrationWorkflow>
            );
          case "formats":
            return (
              <MarketingBand
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:bg-background-dimmed"
              >
                <MarketingHeading
                  title={section.title}
                  description={section.description}
                  className="pb-8"
                />
                <ProductFeedsFormats
                  title={section.title}
                  rows={section.rows ?? []}
                />
                {children}
              </MarketingBand>
            );
          case "setup":
            return (
              <MarketingBand
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="grid lg:grid-cols-[1fr_2fr]">
                  <div className="flex flex-col border-accent-foreground lg:border-r">
                    <MarketingHeading
                      title={section.title}
                      description={section.description}
                    />
                    {section.note && (
                      <p className="mx-7 mb-10 border-primary border-l-2 pl-4 text-foreground-dimmed max-sm:mx-4">
                        {section.note}
                      </p>
                    )}
                    <CommerceFigure kind="format" className="mt-auto" />
                  </div>
                  <JourneySteps
                    label={section.title}
                    className="border-accent-foreground max-lg:border-t"
                    items={(section.items ?? []).map((item, index) => ({
                      id: item.title,
                      title: item.title,
                      icon:
                        (["website", "connect", "catalog", "compare"] as const)[
                          index
                        ] ?? "catalog",
                      content: <p className="max-w-[60ch]">{item.body}</p>,
                    }))}
                  />
                </div>
                {children}
              </MarketingBand>
            );
          default:
            return (
              <MarketingSection section={section}>{children}</MarketingSection>
            );
        }
      })();

      return (
        <Fragment key={section.id}>
          {section.id !== "workflow" && <SectionGutter />}
          {body}
        </Fragment>
      );
    })}
  </>
);
