import { notFound } from "next/navigation";
import { getLocale, getMessages } from "next-intl/server";
import { CheckoutRun } from "@/components/marketing/interactive/checkout-run";
import { StoreCheck } from "@/components/marketing/interactive/store-check";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import {
  MarketingBand,
  MarketingScreenshot,
} from "@/components/marketing/primitives";
import { pageBodies } from "../_components/page-bodies";
import { ProductExample } from "../_components/product-example";

const pillars = ["connect", "simulate", "fix", "sell", "track"] as const;
const artwork = {
  connect: "catalog",
  simulate: "selection",
  fix: "bag",
  sell: "cart",
  track: "console",
} as const;

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
  const Body = pageBodies[pillar];
  return (
    <MarketingPage
      heroArtwork={artwork[pillar]}
      heroArtworkClassName={
        pillar === "connect"
          ? "left-[42%] right-[-12%] opacity-100 [mask-image:none] max-sm:inset-x-0 max-sm:opacity-45"
          : undefined
      }
      heroChildren={
        pillar === "connect" ? (
          <StoreCheck
            secondaryAction={enterprisePlatform.pages[pillar].actions.find(
              (action) => action.href === "/demo",
            )}
          />
        ) : undefined
      }
      content={{
        ...enterprisePlatform.pages[pillar],
        ...(pillar === "connect" ? { actions: [] } : {}),
        sections: [],
      }}
      path={`/platform/${pillar}`}
    >
      <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:bg-background-dimmed">
        <div className="relative px-7 py-10 max-sm:px-4 max-sm:py-6 [&>.marketing-screenshot]:mt-0">
          <MarketingScreenshot
            src={`/screenshots/${screenshots[pillar].file}${locale === "es" ? "-es" : ""}.png`}
            width={screenshots[pillar].width}
            height={screenshots[pillar][locale === "es" ? "es" : "en"]}
            alt={enterprisePlatform.screenshots[pillar].alt}
            caption={enterprisePlatform.screenshots[pillar].caption}
          />
        </div>
      </MarketingBand>
      <Body
        sections={enterprisePlatform.pages[pillar].sections}
        sectionChildren={{
          example:
            pillar === "sell" ? (
              <CheckoutRun />
            ) : (
              <ProductExample
                kind={pillar}
                content={enterprisePlatform.examples[pillar]}
              />
            ),
        }}
      />
    </MarketingPage>
  );
};
