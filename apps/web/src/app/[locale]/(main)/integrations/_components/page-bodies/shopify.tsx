import { getMessages } from "next-intl/server";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
  MarketingEyebrow,
} from "@/components/marketing/primitives";
import { IntegrationTechnicalText } from "../integration-content";
import { IntegrationWorkflow } from "../integration-workflow";
import { ShopifySetupJourney } from "./shopify-setup-journey";

const ShopifyWorkflow = (props: MarketingSection.Props) => (
  <IntegrationWorkflow {...props} integration="shopify" />
);

const ShopifyAccess = ({ section, children }: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="bg-background-rich px-7 py-10 max-sm:px-4 max-sm:py-8">
      {section.eyebrow && (
        <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
      )}
      <h2 className="max-w-[22ch]">{section.title}</h2>
      <p className="mt-5 max-w-[78ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
        {section.description}
      </p>
    </div>
    {children}
  </MarketingBand>
);

const ShopifyRequirements = ({ section, children }: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="grid grid-cols-[1fr_2fr] max-md:grid-cols-1">
      <div className="min-w-0 border-accent-foreground border-r px-7 py-10 max-sm:px-4 max-sm:py-8 max-md:border-r-0 max-md:border-b">
        {section.eyebrow && (
          <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
        )}
        <h2>{section.title}</h2>
        {section.links && <MarketingActions actions={section.links} />}
      </div>
      <div className="min-w-0 divide-y divide-accent-foreground">
        {section.paragraphs?.map((paragraph, index) => (
          <div
            key={paragraph}
            className="grid grid-cols-[32px_1fr] gap-5 px-7 py-7 max-sm:gap-4 max-sm:px-4 max-sm:py-6"
          >
            <span aria-hidden="true" className="text-primary text-xl">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="text-foreground-dimmed leading-relaxed">
              <IntegrationTechnicalText text={paragraph} />
            </p>
          </div>
        ))}
      </div>
    </div>
    {children}
  </MarketingBand>
);

const ShopifySetup = ({ section, children }: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="px-7 py-10 max-sm:px-4 max-sm:py-8">
      {section.eyebrow && (
        <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
      )}
      <h2>{section.title}</h2>
    </div>
    {section.items && (
      <ShopifySetupJourney title={section.title} items={section.items} />
    )}
    {section.note && (
      <p className="border-accent-foreground border-t bg-background-dimmed px-7 py-6 text-foreground-dimmed leading-relaxed max-sm:px-4">
        {section.note}
      </p>
    )}
    {children}
  </MarketingBand>
);

export const ShopifyBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { browserShopify } = await getMessages();

  return (
    <>
      {sections.map((section) => {
        const Section = (() => {
          switch (section.id) {
            case "workflow":
              return ShopifyWorkflow;
            case "access":
              return ShopifyAccess;
            case "requirements":
              return ShopifyRequirements;
            case "setup":
              return ShopifySetup;
            default:
              return MarketingSection;
          }
        })();

        return (
          <Section
            key={section.id}
            section={{
              ...section,
              eyebrow: Object.entries(browserShopify.sections).find(
                ([key]) => key === section.id,
              )?.[1],
            }}
          >
            {sectionChildren?.[section.id]}
          </Section>
        );
      })}
    </>
  );
};
