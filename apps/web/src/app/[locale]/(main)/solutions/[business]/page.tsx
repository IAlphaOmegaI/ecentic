import { pageBodies } from "../_components/page-bodies";
import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { CommerceTimeline } from "@/components/marketing/channels";
import { CatalogFindings } from "@/components/marketing/measured-evidence";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { BusinessChallenges } from "../_components/business-challenges";
import { ProductJourney } from "../_components/product-journey";

const businesses = [
  "brands",
  "retailers-and-marketplaces",
  "enterprise",
  "agencies-and-partners",
] as const;
type Props = { params: Promise<{ business: string }> };

export const generateStaticParams = () =>
  businesses.map((business) => ({ business }));

export const generateMetadata = async ({ params }: Props) => {
  const { business: requested } = await params;
  const business = businesses.find((value) => value === requested);
  if (!business) notFound();
  const { enterpriseSolutions } = await getMessages();
  return marketingMetadata(
    enterpriseSolutions.business[business].meta,
    `/solutions/${business}`,
  );
};

export default async ({ params }: Props) => {
  const { business: requested } = await params;
  const business = businesses.find((value) => value === requested);
  if (!business) notFound();
  const { enterpriseSolutions } = await getMessages();
  const content = enterpriseSolutions.business[business];
  const journey: MarketingPage.Section | undefined = content.sections.find(
    (section) => section.id === "one-product" || section.id === "pilot",
  );
  const sections = content.sections.map((section) =>
    section.id === journey?.id ? { ...section, items: undefined } : section,
  );
  const Body = pageBodies[business];
  return (
    <MarketingPage
      content={{ ...content, sections: [] }}
      path={`/solutions/${business}`}
    >
      <Body
        sections={sections}
        sectionChildren={{
          challenges: (
            <BusinessChallenges
              items={content.challenges}
              labels={content.challengeLabels}
            />
          ),
          ...(business === "enterprise"
            ? {
                measures: (
                  <div className="border-accent-foreground border-t pt-8">
                    <CatalogFindings />
                  </div>
                ),
              }
            : {}),
          ...(journey
            ? { [journey.id]: <ProductJourney items={journey.items ?? []} /> }
            : {}),
        }}
      />
      {business === "retailers-and-marketplaces" && (
        <MarketingBand>
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10">
            <CatalogFindings />
          </div>
        </MarketingBand>
      )}
      {business === "enterprise" && (
        <MarketingBand>
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10">
            <CommerceTimeline />
          </div>
        </MarketingBand>
      )}
    </MarketingPage>
  );
};
