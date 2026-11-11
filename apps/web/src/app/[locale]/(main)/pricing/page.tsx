import { getLocale, getMessages } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { MarketingActions } from "@/components/marketing/primitives";
import { localizePath } from "@/i18n/locale";
import { absoluteUrl } from "@/lib/seo";
import { PartnershipBundle } from "../_components/partnership-bundle";
import {
  EnterprisePlanComparison,
  EnterprisePlanLedger,
  FreeStoreCheck,
  PerformanceFeeLedger,
} from "./_components/enterprise-pricing";

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
  return (
    <MarketingPage
      content={enterprisePricing}
      path="/pricing"
      sectionChildren={{
        "free-check": <FreeStoreCheck />,
        pricing: <EnterprisePlanLedger />,
        "pay-as-you-go": <PerformanceFeeLedger />,
        compare: <EnterprisePlanComparison />,
        europe: (
          <div className="bg-background-dimmed [&>#partnership>div]:max-w-none [&>#partnership>div]:border-x-0 [&>#partnership]:left-0 [&>#partnership]:w-auto">
            <PartnershipBundle
              description={enterprisePricing.bundle.description}
              productDetail={enterprisePricing.bundle.productDetail}
            />
          </div>
        ),
      }}
    >
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
      <div className="marketing-rail relative isolate mx-auto max-w-[1186px] border border-[var(--rail-color)] max-sm:mx-4 max-[1191px]:mx-7">
        <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
          <MarketingActions actions={enterprisePricing.policyLinks} />
        </div>
      </div>
    </MarketingPage>
  );
};
