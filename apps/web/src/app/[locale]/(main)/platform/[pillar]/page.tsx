import { notFound } from "next/navigation";
import { getLocale, getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { MarketingScreenshot } from "@/components/marketing/primitives";
import { ProductExample } from "../_components/product-example";

const pillars = ["connect", "simulate", "fix", "sell", "track"] as const;

const screenshots = {
  connect: { file: "enterprise-connect-sample", width: 1280, en: 673, es: 673 },
  simulate: {
    file: "enterprise-dashboard-sample",
    width: 1280,
    en: 679,
    es: 679,
  },
  fix: { file: "enterprise-fix-sample", width: 1280, en: 513, es: 513 },
  sell: { file: "enterprise-sell-sample", width: 1280, en: 371, es: 376 },
  track: { file: "enterprise-track-sample", width: 1280, en: 559, es: 559 },
} as const;

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
        <MarketingScreenshot
          src={`/screenshots/${screenshots[pillar].file}${locale === "es" ? "-es" : ""}.png`}
          width={screenshots[pillar].width}
          height={screenshots[pillar][locale === "es" ? "es" : "en"]}
          alt={enterprisePlatform.screenshots[pillar].alt}
          caption={enterprisePlatform.screenshots[pillar].caption}
        />
      }
      sectionChildren={{
        example: (
          <ProductExample content={enterprisePlatform.examples[pillar]} />
        ),
      }}
    />
  );
};
