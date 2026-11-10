import { getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { ChannelTiles } from "./_components/channel-content";

export const generateMetadata = async () => {
  const { enterpriseChannels } = await getMessages();
  return marketingMetadata(enterpriseChannels.index.meta, "/ai-channels");
};

export default async function AiChannelsPage() {
  const { enterpriseChannels: copy } = await getMessages();
  return (
    <MarketingPage content={copy.index} path="/ai-channels">
      <ChannelTiles copy={copy} />
      <MarketingBand>
        <div className="marketing-cell">
          <h2>{copy.method.title}</h2>
          <p className="marketing-lead">{copy.method.body}</p>
          <p className="marketing-note">{copy.method.note}</p>
        </div>
      </MarketingBand>
    </MarketingPage>
  );
}
