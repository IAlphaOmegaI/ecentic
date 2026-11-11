import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import {
  MarketingFaq,
  MarketingPage,
  marketingMetadata,
} from "@/components/marketing/page";
import { MarketingStatus } from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { aiChannels } from "@/content/ai-channels";
import {
  ChannelCapabilities,
  ChannelInterests,
  ChannelSources,
} from "../_components/channel-content";

type Props = { params: Promise<{ channel: string }> };
export const generateStaticParams = () =>
  aiChannels.map(({ slug }) => ({ channel: slug }));

export const generateMetadata = async ({ params }: Props) => {
  const { channel: slug } = await params;
  const channel = aiChannels.find((entry) => entry.slug === slug);
  if (!channel) notFound();
  const { enterpriseChannels } = await getMessages();
  return marketingMetadata(
    enterpriseChannels.pages[channel.key].meta,
    channel.href,
  );
};

export default async ({ params }: Props) => {
  const { channel: slug } = await params;
  const channel = aiChannels.find((entry) => entry.slug === slug);
  if (!channel) notFound();
  const { enterpriseChannels: copy } = await getMessages();
  const content = copy.pages[channel.key];
  return (
    <MarketingPage
      content={{ ...content, faqs: undefined }}
      path={channel.href}
      heroChildren={
        <div className="mt-8">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <ProviderLogo
              provider={channel.key}
              decorative
              fallback="none"
              className="h-11 max-w-40"
            />
            <MarketingStatus status={channel.status}>
              {copy.statuses[channel.status]}
            </MarketingStatus>
            <p className="text-foreground-dimmed text-sm">
              {copy.checked}:{" "}
              <time dateTime={channel.checkedAt}>{copy.date}</time>
            </p>
          </div>
          <p className="marketing-note text-(length:--text-sm) mt-6 text-foreground-dimmed">
            {content.trademark}
          </p>
        </div>
      }
      sectionChildren={{
        ecentic: <ChannelCapabilities channel={channel} copy={copy} />,
        next:
          channel.interests.length > 0 ? (
            <div className="marketing-cell relative min-w-0 px-7 py-14 pt-0 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
              <ChannelInterests channel={channel} copy={copy} />
            </div>
          ) : undefined,
      }}
    >
      <MarketingFaq title={copy.faqTitle} items={content.faqs} />
      <ChannelSources channel={channel} copy={copy} />
    </MarketingPage>
  );
};
