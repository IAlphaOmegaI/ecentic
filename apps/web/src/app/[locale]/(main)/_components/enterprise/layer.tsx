import {
  ArrowRightIcon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getMessages } from "next-intl/server";
import {
  MarketingBand,
  MarketingHeading,
  MarketingStatus,
} from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { aiChannels } from "@/content/ai-channels";
import { integrations } from "@/content/integrations";
import { Link } from "@/i18n/navigation";

const sourceKeys = [
  "shopify",
  "woocommerce",
  "productFeeds",
  "csv",
  "adobe",
  "wix",
] as const;

export const CommerceLayer = async () => {
  const {
    enterpriseHome: home,
    enterpriseLayer: copy,
    enterpriseIntegrations: directory,
  } = await getMessages();
  const sources = sourceKeys.flatMap((key) => {
    const source = integrations.find((entry) => entry.key === key);
    return source ? [source] : [];
  });

  return (
    <MarketingBand id="how-it-fits" className="enterprise-connections">
      <MarketingHeading
        title={home.connections.title}
        description={home.connections.description}
      />
      <div
        className="marketing-grid marketing-section-grid grid border-accent-foreground border-t md:grid-cols-2"
        data-columns="2"
      >
        <section
          id="integrations"
          aria-labelledby="homepage-sources-title"
          className="relative flex min-w-0 flex-col bg-background-dimmed"
        >
          <h3
            id="homepage-sources-title"
            className="px-7 py-6 text-2xl max-sm:px-4"
          >
            {copy.stack}
          </h3>
          <ul className="flex-1 divide-y divide-accent-foreground border-accent-foreground border-t">
            {sources.map((source) => {
              const Icon =
                source.key === "productFeeds"
                  ? CommerceFilePenIcon
                  : source.key === "csv"
                    ? CommerceCode_3Icon
                    : null;
              return (
                <li key={source.key}>
                  <Link
                    href={source.href}
                    className="group flex min-w-0 items-start gap-4 px-7 py-5 transition-colors hover:bg-background max-sm:gap-3 max-sm:px-4"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center">
                      {Icon ? (
                        <Icon
                          aria-hidden
                          className="size-8 text-primary-text"
                        />
                      ) : (
                        <ProviderLogo
                          provider={source.key}
                          decorative
                          className="max-h-9 w-9"
                        />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <span className="font-medium text-base text-foreground-rich group-hover:text-primary-text">
                          {directory.entries[source.key].name}
                        </span>
                        <MarketingStatus status={source.status}>
                          {directory.statuses[source.status]}
                        </MarketingStatus>
                      </div>
                      <p className="mt-1 text-foreground-dimmed text-sm leading-relaxed">
                        {directory.entries[source.key].description}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="border-accent-foreground border-t px-7 py-5 max-sm:px-4">
            <Button
              variant="soft"
              color="neutral"
              render={<Link href="/integrations" />}
            >
              {home.integration.links[0]?.label}
              <ArrowRightIcon aria-hidden className="size-4" />
            </Button>
          </div>
        </section>
        <section
          id="channels"
          aria-labelledby="homepage-channels-title"
          className="relative flex min-w-0 flex-col border-accent-foreground border-t bg-background md:border-t-0 md:border-l"
        >
          <h3
            id="homepage-channels-title"
            className="px-7 py-6 text-2xl max-sm:px-4"
          >
            {copy.channels}
          </h3>
          <ul className="flex-1 divide-y divide-accent-foreground border-accent-foreground border-t">
            {home.channels.items.map((item) => {
              const channel = aiChannels.find((entry) => entry.key === item.id);
              if (!channel) return null;
              return (
                <li key={channel.key}>
                  <Link
                    href={channel.href}
                    className="group flex min-w-0 items-start gap-4 px-7 py-5 transition-colors hover:bg-background-dimmed max-sm:gap-3 max-sm:px-4"
                  >
                    <ProviderLogo
                      provider={channel.key}
                      decorative
                      className="size-9 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <span className="font-medium text-base text-foreground-rich group-hover:text-primary-text">
                          {item.title}
                        </span>
                        <MarketingStatus status={channel.status}>
                          {item.statusLabel}
                        </MarketingStatus>
                      </div>
                      <p className="mt-1 text-foreground-dimmed text-sm leading-relaxed">
                        {item.body}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="border-accent-foreground border-t px-7 py-5 max-sm:px-4">
            <Button
              variant="soft"
              color="neutral"
              render={<Link href="/ai-channels" />}
            >
              {copy.action}
              <ArrowRightIcon aria-hidden className="size-4" />
            </Button>
          </div>
        </section>
      </div>
    </MarketingBand>
  );
};
