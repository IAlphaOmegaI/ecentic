import { getFormatter, getMessages, getTranslations } from "next-intl/server";
import { MarketingLead } from "@/components/marketing/lead";
import {
  MarketingPage,
  MarketingSection,
  marketingMetadata,
} from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { integrationCounts } from "@/content/integrations";
import { IntegrationWall } from "./_components/integration-content";

export const generateMetadata = async () => {
  const { enterpriseIntegrations } = await getMessages();
  return marketingMetadata(enterpriseIntegrations.index.meta, "/integrations");
};

export default async function IntegrationsPage() {
  const { enterpriseIntegrations: copy } = await getMessages();
  const translate = await getTranslations("enterpriseIntegrations");
  const formatter = await getFormatter();
  return (
    <MarketingPage
      content={copy.index}
      path="/integrations"
      heroChildren={
        <div className="mt-8">
          <p className="font-medium text-primary text-xl">
            {translate("counter", {
              live: formatter.number(integrationCounts.live),
              feed: formatter.number(integrationCounts.feed),
              soon: formatter.number(integrationCounts.soon),
            })}
          </p>
          <p className="marketing-note">{copy.labelNote}</p>
          <p className="mt-3 text-foreground-dimmed text-sm">
            {copy.counterNote}
          </p>
        </div>
      }
    >
      <IntegrationWall copy={copy} />
      <MarketingSection
        section={{
          id: "labels",
          title: copy.legend.title,
          items: copy.legend.items,
          columns: 2,
        }}
      />
      <MarketingBand id="standards">
        <div className="marketing-cell">
          <h2>{copy.standards.title}</h2>
          <p>{copy.standards.description}</p>
        </div>
        <dl className="marketing-rows">
          {copy.standards.items.map((item) => (
            <div key={item.title}>
              <dt>{item.title}</dt>
              <dd>{item.body}</dd>
            </div>
          ))}
        </dl>
      </MarketingBand>
      <MarketingBand id="request" className="marketing-field">
        <div className="marketing-cell">
          <h2>{copy.request.title}</h2>
          <p className="marketing-lead">{copy.request.description}</p>
          <div className="mt-8">
            <MarketingLead
              kind="integration"
              topic="integration-request"
              title={copy.request.button}
            />
          </div>
        </div>
      </MarketingBand>
    </MarketingPage>
  );
}
