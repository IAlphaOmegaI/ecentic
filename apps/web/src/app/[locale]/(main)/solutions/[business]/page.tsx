import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
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
  return (
    <MarketingPage
      content={{ ...content, sections }}
      path={`/solutions/${business}`}
      darkHero={business === "enterprise"}
      sectionChildren={{
        challenges: (
          <BusinessChallenges
            items={content.challenges}
            labels={content.challengeLabels}
          />
        ),
        ...(journey
          ? { [journey.id]: <ProductJourney items={journey.items ?? []} /> }
          : {}),
      }}
    />
  );
};
