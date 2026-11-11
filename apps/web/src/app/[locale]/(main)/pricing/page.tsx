import { getLocale, getMessages } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
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
          <PartnershipBundle
            description={enterprisePricing.bundle.description}
            productDetail={enterprisePricing.bundle.productDetail}
          />
        ),
      }}
    >
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
            <Link
              key={action.href}
              href={action.href}
              className="text-primary-text underline decoration-1 underline-offset-4"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </MarketingBand>
    </MarketingPage>
  );
};
