import { FileIcon } from "@zenncore/icons";
import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { CheckoutRun } from "@/components/marketing/interactive/checkout-run";
import {
  MarketingFaq,
  MarketingPage,
  marketingMetadata,
} from "@/components/marketing/page";
import { MarketingStatus } from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { integrationPages } from "@/content/integrations";
import {
  FeedExporters,
  IntegrationLedger,
  IntegrationSources,
} from "../_components/integration-content";
import { pageBodies } from "../_components/page-bodies";

type Props = { params: Promise<{ integration: string }> };
export const generateStaticParams = () =>
  integrationPages.map(({ slug }) => ({ integration: slug }));

export const generateMetadata = async ({ params }: Props) => {
  const { integration: slug } = await params;
  const integration = integrationPages.find((entry) => entry.slug === slug);
  if (!integration) notFound();
  const { enterpriseIntegrations } = await getMessages();
  return marketingMetadata(
    enterpriseIntegrations.pages[integration.key].meta,
    `/integrations/${integration.slug}`,
  );
};

export default async ({ params }: Props) => {
  const { integration: slug } = await params;
  const integration = integrationPages.find((entry) => entry.slug === slug);
  if (!integration) notFound();
  const { enterpriseIntegrations: copy } = await getMessages();
  const content = copy.pages[integration.key];
  const Body = pageBodies[integration.key];
  return (
    <MarketingPage
      content={{ ...content, sections: [], faqs: undefined }}
      path={`/integrations/${integration.slug}`}
      heroArtwork={integration.key === "shopify" ? "closing" : undefined}
      heroArtworkFit={integration.key === "shopify" ? "cover" : undefined}
      heroArtworkClassName={
        integration.key === "shopify"
          ? "inset-x-auto left-1/2 w-[calc(100dvw-24px)] -translate-x-1/2 opacity-60 [mask-image:linear-gradient(35deg,transparent_25%,black_85%)] max-sm:inset-x-auto max-sm:left-1/2 max-sm:w-[calc(100dvw-16px)] max-sm:opacity-35 max-sm:[mask-image:linear-gradient(to_bottom,black,transparent_75%)]"
          : undefined
      }
      heroIdentity={
        integration.key === "productFeeds" ? (
          <FileIcon
            aria-hidden
            className="size-28 text-background-rich sm:size-36"
          />
        ) : (
          <ProviderLogo
            provider={integration.key}
            decorative
            fallback="none"
            className="h-28 w-auto max-w-[min(70vw,400px)] rounded-none object-left sm:h-36"
          />
        )
      }
      heroMeta={
        integration.key === "shopify" ? undefined : (
          <div className="flex flex-wrap items-center gap-4">
            <MarketingStatus status="live">
              {copy.statuses.live}
            </MarketingStatus>
          </div>
        )
      }
    >
      <Body
        sections={content.sections}
        sectionChildren={{
          access: (
            <IntegrationLedger
              rows={content.ledger}
              copy={copy}
              showIcons={integration.key === "woocommerce"}
            />
          ),
          "agent-checkout":
            integration.key === "woocommerce" ? (
              <CheckoutRun variant="code" />
            ) : undefined,
          "export-platforms":
            integration.key === "productFeeds" ? (
              <FeedExporters copy={copy} />
            ) : undefined,
        }}
      />
      <MarketingFaq title={copy.faqTitle} items={content.faqs} />
      <IntegrationSources pageKey={integration.key} copy={copy} />
    </MarketingPage>
  );
};
