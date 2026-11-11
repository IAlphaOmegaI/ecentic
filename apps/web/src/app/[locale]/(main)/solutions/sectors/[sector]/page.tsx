import { pageBodies } from "../_components/page-bodies";
import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { SpecificationMap } from "../../_components/specification-map";

const sectors = [
  "food-and-beverage",
  "wine-and-spirits",
  "beauty-and-personal-care",
  "consumer-electronics",
  "home-and-furniture",
  "fashion-and-outdoor",
  "health-wellness-and-pet",
  "travel-and-experiences",
] as const;
type Props = { params: Promise<{ sector: string }> };

export const generateStaticParams = () => sectors.map((sector) => ({ sector }));

export const generateMetadata = async ({ params }: Props) => {
  const { sector: requested } = await params;
  const sector = sectors.find((value) => value === requested);
  if (!sector) notFound();
  const { enterpriseSolutions } = await getMessages();
  return marketingMetadata(
    enterpriseSolutions.sectors[sector].meta,
    `/solutions/sectors/${sector}`,
  );
};

export default async ({ params }: Props) => {
  const { sector: requested } = await params;
  const sector = sectors.find((value) => value === requested);
  if (!sector) notFound();
  const { enterpriseSolutions } = await getMessages();
  const content = enterpriseSolutions.sectors[sector];
  const specification: MarketingPage.Section | undefined =
    content.sections.find((section) => section.id === "attributes");
  const sections = content.sections.map((section) =>
    section.id === "attributes" ? { ...section, items: undefined } : section,
  );
  const Body = pageBodies[sector];
  return (
    <MarketingPage
      content={{ ...content, sections: [] }}
      path={`/solutions/sectors/${sector}`}
    >
      <Body
        sections={sections}
        sectionChildren={{
          attributes: (
            <SpecificationMap
              items={specification?.items ?? []}
              labels={enterpriseSolutions.specificationLabels}
            />
          ),
        }}
      />
    </MarketingPage>
  );
};
