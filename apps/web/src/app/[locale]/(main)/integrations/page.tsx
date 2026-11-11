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

export default async () => {
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
          <p className="marketing-note text-(length:--text-sm) mt-6 text-foreground-dimmed">
            {copy.labelNote}
          </p>
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
        <div className="marketing-cell relative min-w-0 px-7 pt-24 pb-12 max-sm:px-4 max-sm:pt-14 max-sm:pb-8 [&>h2+p]:mt-6 [&>h3+p]:mt-6 [&>p]:max-w-[70ch]">
          <h2>{copy.standards.title}</h2>
          <p>{copy.standards.description}</p>
        </div>
        <dl className="marketing-rows border-[var(--rail-color)] border-b [&>div]:grid [&>div]:grid-cols-[minmax(140px,1fr)_2fr] [&>div]:gap-7 [&>div]:border-[var(--rail-color)] [&>div]:border-t [&>div]:px-7 [&>div]:py-6 max-sm:[&>div]:grid-cols-1 max-sm:[&>div]:gap-2 max-sm:[&>div]:px-4 [&_dd]:m-0 [&_dt]:font-medium [&_dt]:text-foreground-rich">
          {copy.standards.items.map((item) => (
            <div key={item.title}>
              <dt>{item.title}</dt>
              <dd>{item.body}</dd>
            </div>
          ))}
        </dl>
      </MarketingBand>
      <MarketingBand
        id="request"
        className="marketing-field bg-background [&>.marketing-rail]:bg-background-dimmed [&_.marketing-note]:text-foreground"
      >
        <div className="marketing-cell relative min-w-0 px-7 py-24 max-sm:px-4 max-sm:py-14 [&>h2+p]:mt-6 [&>h3+p]:mt-6 [&>p]:max-w-[70ch]">
          <h2>{copy.request.title}</h2>
          <p className="marketing-lead mt-6 max-w-[720px] text-[clamp(1.125rem,1.6vw,1.35rem)] leading-[1.55]">
            {copy.request.description}
          </p>
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
};
