import { getMessages } from "next-intl/server";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingLead } from "@/components/marketing/lead";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import {
  MarketingBand,
  MarketingStatus,
} from "@/components/marketing/primitives";
import { SectionGutter } from "../dashboard/_components/grid";
import {
  IntegrationDirectory,
  IntegrationImportFlow,
} from "./_components/integration-directory";

export const generateMetadata = async () => {
  const { enterpriseIntegrations } = await getMessages();
  return marketingMetadata(enterpriseIntegrations.index.meta, "/integrations");
};

export default async () => {
  const { enterpriseIntegrations: copy, browserIntegrations: directory } =
    await getMessages();
  return (
    <MarketingPage
      content={copy.index}
      path="/integrations"
      heroArtwork="console"
    >
      <SectionGutter />
      <IntegrationDirectory copy={copy} directory={directory} />
      <SectionGutter />
      <IntegrationImportFlow copy={copy} directory={directory} />
      <SectionGutter />
      <MarketingBand
        id="labels"
        className="[&>.marketing-rail>.marketing-guides]:hidden"
      >
        <div className="px-7 pt-14 pb-10 max-sm:px-4 max-sm:pt-10">
          <h2>{copy.legend.title}</h2>
          <p className="mt-4 max-w-[68ch] text-foreground-dimmed">
            {copy.labelNote}
          </p>
        </div>
        <dl className="grid md:grid-cols-2">
          {copy.legend.items.map((item, index) => (
            <div
              key={item.title}
              className="border-accent-foreground border-t px-7 py-8 max-sm:px-4 md:odd:border-r"
            >
              <dt>
                <MarketingStatus
                  status={
                    ["live", "feed", "simulated", "soon"][index] ?? "soon"
                  }
                >
                  {item.title}
                </MarketingStatus>
              </dt>
              <dd className="mt-4 max-w-[48ch] text-foreground-dimmed">
                {item.body}
              </dd>
            </div>
          ))}
        </dl>
      </MarketingBand>
      <SectionGutter />
      <MarketingBand
        id="standards"
        className="[&>.marketing-rail>.marketing-guides]:hidden"
      >
        <div className="px-7 pt-14 pb-10 max-sm:px-4 max-sm:pt-10">
          <h2>{copy.standards.title}</h2>
          <p className="mt-4 max-w-[66ch] text-foreground-dimmed">
            {copy.standards.description}
          </p>
        </div>
        <dl className="grid md:grid-cols-2">
          {copy.standards.items.map((item) => (
            <div
              key={item.title}
              className="border-accent-foreground border-t px-7 py-8 max-sm:px-4 md:odd:border-r"
            >
              <dt className="font-heading text-2xl text-primary-text tracking-tight">
                {item.title}
              </dt>
              <dd className="mt-3 text-foreground-dimmed">{item.body}</dd>
            </div>
          ))}
        </dl>
      </MarketingBand>
      <SectionGutter />
      <MarketingBand
        id="request"
        className="[&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:bg-background-dimmed [&_.marketing-note]:text-foreground"
      >
        <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="relative min-w-0 px-7 py-16 max-sm:px-4 max-sm:py-10">
            <h2>{copy.request.title}</h2>
            <p className="mt-6 max-w-[48ch] text-lg leading-relaxed">
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
          <div
            aria-hidden="true"
            className="relative min-h-72 overflow-hidden border-accent-foreground border-t text-primary-text md:border-t-0 md:border-l"
          >
            <div className="absolute inset-0">
              <EvolvingAscii artwork="bag" fit="cover" />
            </div>
          </div>
        </div>
      </MarketingBand>
    </MarketingPage>
  );
};
