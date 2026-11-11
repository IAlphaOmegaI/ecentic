import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { AppConfig } from "next-intl";
import {
  MarketingActions,
  MarketingBand,
  MarketingHeading,
  MarketingStatus,
} from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { aiChannels } from "@/content/ai-channels";
import { Link } from "@/i18n/navigation";
import { HeroVideo } from "../hero-video";
import { BusinessTabs } from "./business-tabs";
import { IntegrationsPreview } from "./integrations-preview";

const mechanisms = [
  { Icon: CommerceChartActivity_2Icon, signal: "primary" },
  { Icon: CommerceFileShieldIcon, signal: "success" },
  { Icon: CommerceFilePenIcon, signal: "secondary" },
  { Icon: CommercePlug_3SparkleIcon, signal: "info" },
  { Icon: CommerceBasketShoppingIcon, signal: "warning" },
  { Icon: CommerceCode_3Icon, signal: "foreground" },
] as const;

export const Businesses = ({ copy }: Businesses.Props) => (
  <MarketingBand id="solutions">
    <MarketingHeading
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
    />
    <BusinessTabs copy={copy} />
  </MarketingBand>
);

export const ProductFilm = ({ copy }: ProductFilm.Props) => (
  <MarketingBand
    id="film"
    className="enterprise-film [&>.marketing-rail]:bg-background-dimmed"
  >
    <MarketingHeading
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
    />
    <div
      className="marketing-grid marketing-section-grid grid grid-cols-1"
      data-columns="1"
    >
      <div className="relative min-w-0 border-[var(--rail-color)] border-t p-6 max-sm:p-4">
        <HeroVideo />
      </div>
    </div>
  </MarketingBand>
);

export const Channels = ({ copy }: Channels.Props) => (
  <MarketingBand id="channels">
    <MarketingHeading
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      action={copy.link}
    />
    <div className="enterprise-channel-grid marketing-section-grid grid grid-cols-3 max-sm:grid-cols-1 max-[1001px]:grid-cols-2">
      {copy.items.map((item) => {
        const channel = aiChannels.find((channel) => channel.key === item.id);
        return (
          <Link
            key={item.id}
            href={item.href}
            className="group relative flex min-w-0 flex-col gap-4 border-[var(--rail-color)] border-t border-r px-6 py-8 transition-colors hover:bg-background-dimmed max-sm:border-r-0 max-sm:px-4 max-[1001px]:nth-[2n]:border-r-0 min-[1001px]:nth-[3n]:border-r-0"
          >
            {channel && (
              <ProviderLogo provider={channel.key} className="mb-2 size-12" />
            )}
            <h3 className="text-[28px] transition-colors group-hover:text-primary-text">
              {item.title}
            </h3>
            <p className="mb-4 text-foreground-dimmed">{item.body}</p>
            <div className="mt-auto flex items-center justify-between gap-4">
              <MarketingStatus status={channel?.status ?? "soon"}>
                {item.statusLabel}
              </MarketingStatus>
              <ArrowRightIcon
                aria-hidden
                className="size-4 text-primary-text"
              />
            </div>
          </Link>
        );
      })}
    </div>
  </MarketingBand>
);

export const Integrations = ({ copy, directory }: Integrations.Props) => (
  <MarketingBand id="integrations">
    <MarketingHeading
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
    />
    <IntegrationsPreview copy={directory} />
    <div className="px-7 py-8 max-sm:px-4">
      <MarketingActions actions={copy.links} className="mt-0 justify-start" />
    </div>
  </MarketingBand>
);

export const Capabilities = ({ copy }: Capabilities.Props) => (
  <MarketingBand id="capabilities">
    <MarketingHeading eyebrow={copy.eyebrow} title={copy.title} />
    <div
      className="marketing-grid marketing-section-grid grid grid-cols-3 max-sm:grid-cols-1 max-[801px]:grid-cols-2"
      data-columns="3"
    >
      {copy.items.map((item, index) => {
        const mechanism = mechanisms[index];
        const Icon = mechanism?.Icon;
        return (
          <article
            key={item.id}
            data-signal={mechanism?.signal}
            className="group relative flex min-w-0 flex-col gap-4 border-[var(--rail-color)] border-t border-r px-6 py-8 max-sm:border-r-0 max-sm:px-4"
          >
            {Icon && (
              <Icon
                aria-hidden
                className="mb-2 size-8 text-primary group-data-[signal=foreground]:text-foreground group-data-[signal=info]:text-info group-data-[signal=secondary]:text-secondary group-data-[signal=success]:text-success group-data-[signal=warning]:text-warning"
              />
            )}
            <h3>{item.title}</h3>
            <p className="text-foreground-dimmed">{item.body}</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 pb-4 text-foreground-dimmed text-sm">
              {item.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
            <div className="mt-auto flex justify-start">
              <Button render={<Link href={item.href} />}>
                {item.label}
                <ArrowRightIcon aria-hidden className="size-4" />
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  </MarketingBand>
);

export namespace Businesses {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["businesses"];
  };
}

export namespace ProductFilm {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["film"];
  };
}

export namespace Channels {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["channels"];
  };
}

export namespace Integrations {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["integration"];
    directory: AppConfig["Messages"]["enterpriseIntegrations"];
  };
}

export namespace Capabilities {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["mechanisms"];
  };
}
