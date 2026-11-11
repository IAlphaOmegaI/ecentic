import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
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
                  <div className="border-accent-foreground lg:border-r">
                    <MarketingHeading
                      title={section.title}
                      description={section.description}
                    />
                    {section.note && (
                      <p className="mx-7 mb-10 border-primary border-l-2 pl-4 text-foreground-dimmed max-sm:mx-4">
                        {section.note}
                      </p>
                    )}
                  </div>
                  <ol className="divide-y divide-accent-foreground border-accent-foreground max-lg:border-t">
                    {section.items?.map((item, index) => (
                      <li
                        key={item.title}
                        className="grid grid-cols-[48px_1fr] gap-6 px-7 py-8 max-sm:grid-cols-[32px_1fr] max-sm:gap-4 max-sm:px-4"
                      >
                        <span
                          aria-hidden="true"
                          className="text-3xl text-primary"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <h3>{item.title}</h3>
                          <p className="mt-4 max-w-[60ch] text-foreground-dimmed">
                            {item.body}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
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
