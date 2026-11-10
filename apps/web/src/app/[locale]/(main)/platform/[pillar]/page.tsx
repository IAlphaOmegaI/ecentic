import { notFound } from "next/navigation";
import { getLocale, getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { MarketingScreenshot } from "@/components/marketing/primitives";
import { ProductExample } from "../_components/product-example";

const pillars = ["connect", "simulate", "fix", "sell", "track"] as const;

type Props = { params: Promise<{ pillar: string }> };

export const generateStaticParams = () => pillars.map((pillar) => ({ pillar }));

export const generateMetadata = async ({ params }: Props) => {
  const { pillar: requested } = await params;
  const pillar = pillars.find((value) => value === requested);
  if (!pillar) notFound();
  const { enterprisePlatform } = await getMessages();
  return marketingMetadata(
    enterprisePlatform.pages[pillar].meta,
    `/platform/${pillar}`,
  );
};

export default async ({ params }: Props) => {
  const locale = await getLocale();
  const { pillar: requested } = await params;
  const pillar = pillars.find((value) => value === requested);
  if (!pillar) notFound();
  const { enterprisePlatform } = await getMessages();
  return (
    <MarketingPage
      content={enterprisePlatform.pages[pillar]}
      path={`/platform/${pillar}`}
      heroChildren={
        pillar === "simulate" ? (
          <MarketingScreenshot
            src={
              locale === "es"
                ? "/screenshots/enterprise-dashboard-sample-es.png"
                : "/screenshots/enterprise-dashboard-sample.png"
            }
            alt={enterprisePlatform.screenshot.alt}
            caption={enterprisePlatform.screenshot.caption}
          />
        ) : undefined
      }
      sectionChildren={{
        example: (
          <ProductExample content={enterprisePlatform.examples[pillar]} />
        ),
      }}
    />
  );
};
