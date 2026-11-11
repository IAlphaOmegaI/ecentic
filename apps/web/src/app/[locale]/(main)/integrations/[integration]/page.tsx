import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
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
  return (
    <MarketingPage
      content={{ ...content, faqs: undefined }}
      path={`/integrations/${integration.slug}`}
      heroChildren={
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <ProviderLogo
            provider={integration.key}
            decorative
            fallback="none"
            className="h-11 max-w-40"
          />
          <MarketingStatus status="live">{copy.statuses.live}</MarketingStatus>
        </div>
      }
      sectionChildren={{
        access: <IntegrationLedger rows={content.ledger} copy={copy} />,
        "export-platforms":
          integration.key === "productFeeds" ? (
            <FeedExporters copy={copy} />
          ) : undefined,
      }}
    >
      <MarketingFaq title={copy.faqTitle} items={content.faqs} />
      <IntegrationSources pageKey={integration.key} copy={copy} />
    </MarketingPage>
  );
};
