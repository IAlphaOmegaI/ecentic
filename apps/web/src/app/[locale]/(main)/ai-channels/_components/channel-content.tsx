import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceFilePenIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import type { getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { MarketingLead } from "@/components/marketing/lead";
import {
  MarketingBand,
  MarketingFeatureBand,
  MarketingHeading,
  MarketingStatus,
} from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { MarketingSources } from "@/components/marketing/sources";
import { Plus } from "@/components/plus";
import { type AiChannel, aiChannels } from "@/content/ai-channels";
import { Link } from "@/i18n/navigation";
import { CapabilityGraphic } from "./capability-graphic";

type Copy = Awaited<ReturnType<typeof getMessages>>["enterpriseChannels"];
const capabilities = ["simulate", "fix", "checkout", "track"] as const;

export const ChannelInterests = ({ channel, copy }: ChannelInterests.Props) => (
  <div className="flex flex-wrap items-start gap-4">
    {channel.interests.map((topic) => (
      <MarketingLead
        key={topic}
        kind="interest"
        topic={topic}
        title={copy.interests[topic]}
        triggerLabel={copy.interests[topic]}
      />
    ))}
  </div>
);

export const ChannelTiles = ({ copy }: ChannelTiles.Props) => (
  <MarketingBand>
    <div className="marketing-grid grid grid-cols-3 border-[var(--rail-color)] border-b data-[columns=1]:grid-cols-1 data-[columns=2]:grid-cols-2 data-[columns=4]:grid-cols-4 data-[columns=5]:grid-cols-5 max-sm:grid-cols-1 max-sm:data-[columns]:grid-cols-1 max-[801px]:grid-cols-2 max-[801px]:data-[columns]:grid-cols-2 [&>*]:min-w-0 [&>*]:border-[var(--rail-color)] [&>*]:border-t [&>*]:border-r [&>*]:px-7 [&>*]:py-8 max-sm:[&>*]:border-r-0 max-sm:[&>*]:px-4 max-sm:[&>*]:py-7 min-[801px]:data-ordered:[&>article]:py-10 [&_.marketing-item-link]:mt-7 [&_.marketing-item-link]:inline-flex [&_.marketing-item-link]:items-center [&_.marketing-item-link]:gap-2 [&_a:hover]:underline [&_a]:text-primary-text [&_a]:decoration-1 [&_a]:underline-offset-4 [&_h3]:max-w-[24ch] min-[801px]:data-ordered:[&_h3]:max-w-[20ch] [&_p]:mt-4">
      {aiChannels.map((channel) => (
        <article
          key={channel.key}
          className="flex min-w-0 flex-col"
          data-display={channel.display}
        >
          <div className="mb-8 flex items-center justify-between gap-4">
            <ProviderLogo
              provider={channel.key}
              decorative
              fallback="none"
              className="h-10 max-w-32"
            />
            <MarketingStatus status={channel.status}>
              {copy.statuses[channel.status]}
            </MarketingStatus>
          </div>
          <h2 className="!text-2xl">
            <Link href={channel.href}>{copy.names[channel.key]}</Link>
          </h2>
          <p className="mb-6">{copy.summaries[channel.key]}</p>
          <div className="mt-auto">
            <ChannelInterests channel={channel} copy={copy} />
            <Link href={channel.href} className="marketing-item-link">
              {copy.open}
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </article>
      ))}
    </div>
  </MarketingBand>
);

const capabilityIcons = [
  CommerceChartActivity_2Icon,
  CommerceFilePenIcon,
  CommerceBasketShoppingIcon,
  CommercePlug_3SparkleIcon,
];

export const ChannelWorkbench = ({
  section,
  children,
}: {
  section: MarketingBodyProps["sections"][number];
  children: ReactNode;
}) => (
  <MarketingFeatureBand id={section.id}>
    <MarketingHeading
      title={section.title}
      description={section.description}
      className="[&>p]:text-background-rich/70"
    />
    {children}
  </MarketingFeatureBand>
);

export const ChannelCapabilities = ({
  channel,
  copy,
}: ChannelCapabilities.Props) => (
  <div
    data-channel-capabilities
    className="relative grid gap-px border border-[var(--rail-color)] border-x-transparent bg-[var(--rail-color)] bg-clip-padding md:grid-cols-2 lg:grid-cols-3"
  >
    {capabilities.map((capability, index) => {
      const Icon = capabilityIcons[index];
      const status = channel.capabilities[capability];
      const available = status === "live";
      return (
        <article
          key={capability}
          className={cn(
            "relative isolate flex min-w-0 flex-col bg-emphasis-dimmed",
            (index === 0 || index === 3) && "lg:col-span-2",
            available &&
              "bg-linear-to-br from-primary-dimmed/65 to-emphasis-dimmed",
          )}
        >
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35" />
          {index > 0 && (
            <Plus
              className={cn(
                "top-0 right-0 translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35",
                index === 1 || index === 2 ? "md:hidden" : "",
              )}
            />
          )}
          {index === 3 && (
            <Plus className="bottom-0 left-0 hidden -translate-x-1/2 translate-y-1/2 md:block [&>span]:bg-background-rich/35" />
          )}
          {index === 3 && (
            <Plus className="top-0 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block [&>span]:bg-background-rich/35" />
          )}
          <div className="px-7 pt-8 max-sm:px-4">
            <div className="mb-6 flex items-center gap-4" aria-hidden>
              {Icon && <Icon className="size-8 text-primary-rich" />}
              <span className="h-px w-12 bg-linear-to-r from-primary-rich/60 to-transparent" />
            </div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h3>{copy.capabilityNames[capability]}</h3>
              <span className="[&>.marketing-status]:text-background-rich/80">
                <MarketingStatus status={status}>
                  {copy.statuses[status]}
                </MarketingStatus>
              </span>
            </div>
            <p className="mt-4 max-w-[52ch] text-background-rich/75 leading-relaxed">
              {copy.pages[channel.key].capabilities[capability]}
            </p>
          </div>
          <div className="mt-auto pt-6">
            <CapabilityGraphic capability={capability} channel={channel.key} />
          </div>
        </article>
      );
    })}
    <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35" />
    <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 [&>span]:bg-background-rich/35" />
    <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2 [&>span]:bg-background-rich/35" />
  </div>
);

export const ChannelSources = ({ channel, copy }: ChannelSources.Props) => (
  <MarketingSources
    title={copy.sourceTitle}
    description={copy.sourceNote}
    checked={copy.checked}
    date={copy.date}
    dateTime={channel.checkedAt}
    sources={channel.sources.map((source) => ({
      label: copy.sources[source.key],
      href: source.url,
    }))}
  />
);

export namespace ChannelInterests {
  export type Props = { channel: AiChannel; copy: Copy };
}

export namespace ChannelCapabilities {
  export type Props = { channel: AiChannel; copy: Copy };
}

export namespace ChannelSources {
  export type Props = { channel: AiChannel; copy: Copy };
}

export namespace ChannelTiles {
  export type Props = { copy: Copy };
}
