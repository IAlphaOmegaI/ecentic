import { getMessages } from "next-intl/server";
import {
  ChannelComparison,
  CommerceTimeline,
} from "@/components/marketing/channels";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { ChannelTiles } from "./_components/channel-content";

export const generateMetadata = async () => {
  const { enterpriseChannels } = await getMessages();
  return marketingMetadata(enterpriseChannels.index.meta, "/ai-channels");
};

export default async () => {
  const { enterpriseChannels: copy } = await getMessages();
  return (
    <MarketingPage content={copy.index} path="/ai-channels">
      <ChannelTiles copy={copy} />
      <MarketingBand>
        <div className="marketing-cell relative min-w-0 px-7 py-24 max-sm:px-4 max-sm:py-14">
          <CommerceTimeline />
        </div>
      </MarketingBand>
      <MarketingBand>
        <div className="marketing-cell relative min-w-0 px-7 py-24 max-sm:px-4 max-sm:py-14">
          <ChannelComparison />
        </div>
      </MarketingBand>
      <MarketingBand>
        <div className="marketing-cell relative min-w-0 px-7 py-24 max-sm:px-4 max-sm:py-14 [&>h2+p]:mt-6 [&>h3+p]:mt-6 [&>p]:max-w-[70ch]">
          <h2>{copy.method.title}</h2>
          <p className="marketing-lead mt-6 max-w-[720px] text-[clamp(1.125rem,1.6vw,1.35rem)] leading-[1.55]">
            {copy.method.body}
          </p>
          <p className="marketing-note text-(length:--text-sm) mt-6 text-foreground-dimmed">
            {copy.method.note}
          </p>
        </div>
      </MarketingBand>
    </MarketingPage>
  );
};
