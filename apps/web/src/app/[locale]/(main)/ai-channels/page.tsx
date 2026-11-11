import { getMessages } from "next-intl/server";
import {
  ChannelComparison,
  CommerceTimeline,
} from "@/components/marketing/channels";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { aiChannels } from "@/content/ai-channels";
import { ChannelInterests } from "./_components/channel-content";
import { IndexExplorer } from "./_components/index-explorer";
import { RouterFigure } from "./_components/router-figure";

const capabilities = ["simulate", "fix", "checkout", "track"] as const;

export const generateMetadata = async () => {
  const { enterpriseChannels } = await getMessages();
  return marketingMetadata(enterpriseChannels.index.meta, "/ai-channels");
};

export default async () => {
  const {
    hairlineChannels,
    enterpriseChannels: copy,
    indexAiChannels: explorer,
  } = await getMessages();
  return (
    <MarketingPage
      content={copy.index}
      path="/ai-channels"
      heroIllustration={<RouterFigure label={hairlineChannels.label} />}
    >
      <MarketingBand
        id="channel-explorer"
        className="[&>.marketing-rail>.marketing-guides]:hidden"
      >
        <div className="marketing-cell relative border-accent-foreground border-b px-8 py-12 max-sm:px-4 max-sm:py-8">
          <h2>{explorer.title}</h2>
          <p className="mt-4 max-w-[58ch] text-foreground-dimmed text-lg leading-relaxed">
            {explorer.description}
          </p>
        </div>
        <IndexExplorer
          labels={{
            ...explorer,
            open: copy.open,
            sourceTitle: copy.sourceTitle,
            checked: copy.checked,
            date: copy.date,
          }}
          channels={aiChannels.map((channel) => ({
            key: channel.key,
            name: copy.names[channel.key],
            href: channel.href,
            summary: copy.summaries[channel.key],
            status: channel.status,
            statusLabel: copy.statuses[channel.status],
            checkedAt: channel.checkedAt,
            interests: channel.interests.length ? (
              <ChannelInterests channel={channel} copy={copy} />
            ) : null,
            capabilities: capabilities.map((capability) => ({
              key: capability,
              title: copy.capabilityNames[capability],
              status: channel.capabilities[capability],
              statusLabel: copy.statuses[channel.capabilities[capability]],
              detail: copy.pages[channel.key].capabilities[capability],
            })),
            sources: channel.sources.map((source) => ({
              title: copy.sources[source.key],
              href: source.url,
            })),
          }))}
        />
      </MarketingBand>
      <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:bg-background-dimmed">
        <div className="marketing-cell relative min-w-0 px-8 py-16 max-sm:px-4 max-sm:py-12">
          <CommerceTimeline />
        </div>
      </MarketingBand>
      <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden">
        <div className="marketing-cell relative min-w-0 px-8 py-16 max-sm:px-4 max-sm:py-12">
          <ChannelComparison />
        </div>
      </MarketingBand>
      <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden">
        <div className="grid min-[1000px]:grid-cols-[1fr_2fr]">
          <div className="relative min-h-56 bg-background-dimmed px-8 py-8 text-primary-text max-[999px]:border-accent-foreground max-[999px]:border-b min-[1000px]:border-accent-foreground min-[1000px]:border-r">
            <div className="absolute inset-8">
              <EvolvingAscii artwork="console" />
            </div>
          </div>
          <div className="marketing-cell relative min-w-0 px-8 py-16 max-sm:px-4 max-sm:py-12">
            <h2>{copy.method.title}</h2>
            <p className="marketing-lead mt-6 max-w-[60ch] text-foreground-dimmed text-lg leading-relaxed">
              {copy.method.body}
            </p>
            <p className="marketing-note mt-6 text-foreground-dimmed text-sm">
              {copy.method.note}
            </p>
          </div>
        </div>
      </MarketingBand>
    </MarketingPage>
  );
};
