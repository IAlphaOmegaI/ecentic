import { getLocale, getMessages } from "next-intl/server";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { JsonLd } from "@/components/json-ld";
import {
  MarketingPage,
  MarketingSection,
  marketingMetadata,
} from "@/components/marketing/page";
import {
  MarketingBand,
  MarketingFeatureBand,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { absoluteUrl } from "@/lib/seo";
import { PartnershipBundle } from "../_components/partnership-bundle";
import {
  EnterprisePlanComparison,
  EnterprisePlanLedger,
  FreeStoreCheck,
  PerformanceFeeLedger,
} from "./_components/enterprise-pricing";
import { PricingFigure } from "./_components/pricing-figure";

export const generateMetadata = async () => {
  const { enterprisePricing } = await getMessages();
  return marketingMetadata(enterprisePricing.meta, "/pricing");
};

export default async () => {
  const { enterprisePricing, pricing } = await getMessages();
  const locale = await getLocale();
  const offers = pricing.schema.plans.filter((plan) =>
    Number.isFinite(Number(plan.price)),
  );
  const prices = offers.map((plan) => Number(plan.price));
  const url = absoluteUrl(localizePath("/pricing", locale));
  const sectionChildren: Record<string, React.ReactNode> = {
    "free-check": <FreeStoreCheck />,
    "pay-as-you-go": <PerformanceFeeLedger />,
    compare: <EnterprisePlanComparison />,
    europe: (
      <PartnershipBundle
        description={enterprisePricing.bundle.description}
        productDetail={enterprisePricing.bundle.productDetail}
      />
    ),
  };
  return (
    <MarketingPage
      content={{ ...enterprisePricing, sections: [] }}
      path="/pricing"
      heroIllustration={
        <PricingFigure label={enterprisePricing.sample.figureLabel} />
      }
    >
      {enterprisePricing.sections.map((section) =>
        section.id === "pricing" ? (
          <MarketingFeatureBand key={section.id} id={section.id} tone="dark">
            <MarketingHeading
              eyebrow={section.eyebrow}
              title={section.title}
              description={section.description}
              className="pb-12 [&>p:last-child]:text-background-rich/70"
            />
            <EnterprisePlanLedger />
          </MarketingFeatureBand>
        ) : section.id === "compare" ? (
          <Fragment key={section.id}>
            <MarketingBand
              aria-hidden="true"
              className="bg-background [&_.marketing-guides]:hidden"
            >
              <div className="py-4">
                <SectionGutter />
              </div>
            </MarketingBand>
            <MarketingFeatureBand id={section.id} tone="muted">
              <MarketingHeading
                eyebrow={section.eyebrow}
                title={section.title}
                description={section.description}
                className="pb-12"
              />
              <EnterprisePlanComparison />
            </MarketingFeatureBand>
          </Fragment>
        ) : (
          <MarketingSection key={section.id} section={section}>
            {sectionChildren[section.id]}
          </MarketingSection>
        ),
      )}
      <MarketingBand>
        <JsonLd
          schemas={[
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "ecentic",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description: enterprisePricing.meta.description,
              url,
              offers: {
                "@type": "AggregateOffer",
                priceCurrency: "USD",
                lowPrice: String(Math.min(...prices)),
                highPrice: String(Math.max(...prices)),
                offerCount: offers.length,
                offers: offers.map((plan, index) => ({
                  "@type": "Offer",
                  name: plan.name,
                  price: plan.price,
                  priceCurrency: "USD",
                  description: enterprisePricing.offerDescriptions[index],
                  url,
                })),
              },
            },
          ]}
        />
        <div className="marketing-cell relative flex min-w-0 flex-wrap gap-6 px-7 py-8 max-sm:px-4">
          {enterprisePricing.policyLinks.map((action) => (
            <Button
              key={action.href}
              variant="outline"
              color="emphasis"
              render={<Link href={action.href} />}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </MarketingBand>
    </MarketingPage>
  );
};

import { Button } from "@zenncore/web/components/button";
