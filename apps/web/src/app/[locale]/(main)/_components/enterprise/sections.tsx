import { ArrowRightIcon } from "@zenncore/icons";
import type { AppConfig } from "next-intl";
import {
  MarketingActions,
  MarketingBand,
  MarketingHeading,
  MarketingStatus,
} from "@/components/marketing/primitives";
import { ProviderArc } from "@/components/marketing/provider-arc";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { aiChannels } from "@/content/ai-channels";
import { catalogConnections } from "@/content/integrations";
import { Link } from "@/i18n/navigation";
import { HeroVideo } from "../hero-video";
import { BusinessTabs } from "./business-tabs";
import { IntegrationsPreview } from "./integrations-preview";

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
    <ProviderArc
      items={catalogConnections}
      label={copy.title}
      center={
        <MarketingActions actions={copy.links.slice(0, 1)} className="mt-0" />
      }
    />
    <IntegrationsPreview copy={directory} />
    <div className="px-7 py-8 max-sm:px-4">
      <MarketingActions
        actions={copy.links.slice(1)}
        className="mt-0 justify-start"
      />
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
