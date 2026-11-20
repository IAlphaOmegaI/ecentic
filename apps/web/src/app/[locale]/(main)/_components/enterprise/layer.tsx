import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getMessages } from "next-intl/server";
import {
  MarketingBand,
  MarketingHeading,
  MarketingStatus,
} from "@/components/marketing/primitives";
import { ProviderArc } from "@/components/marketing/provider-arc";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { aiChannels } from "@/content/ai-channels";
import { catalogConnections } from "@/content/integrations";
import { Link } from "@/i18n/navigation";
import { IntegrationsPreview } from "./integrations-preview";

export const CommerceLayer = async () => {
  const {
    enterpriseHome: home,
    enterpriseLayer: copy,
    enterpriseIntegrations: directory,
  } = await getMessages();
  return (
    <MarketingBand id="how-it-fits" className="enterprise-connections">
      <MarketingHeading
        title={home.connections.title}
        description={home.connections.description}
      />
      <ProviderArc
        artwork="catalog"
        items={catalogConnections}
        label={home.integration.title}
      />
      <div
        className="marketing-grid marketing-section-grid grid border-accent-foreground border-t"
        data-columns="1"
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
          <IntegrationsPreview
            copy={directory}
            categories={["commerce", "feeds", "payments", "pim"]}
            layout="rows"
          />
          <div className="px-7 py-5 max-sm:px-4">
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
          className="relative flex min-w-0 flex-col border-accent-foreground border-t bg-background"
        >
          <h3
            id="homepage-channels-title"
            className="px-7 py-6 text-2xl max-sm:px-4"
          >
            {copy.channels}
          </h3>
          <ul className="divide-y divide-accent-foreground border-accent-foreground border-t bg-background">
            {home.channels.items.map((item) => {
              const channel = aiChannels.find((entry) => entry.key === item.id);
              if (!channel) return null;
              return (
                <li key={channel.key}>
                  <Link
                    href={channel.href}
                    className="group grid min-w-0 grid-cols-6 items-center gap-x-4 gap-y-2 px-7 py-4 transition-colors hover:bg-background-dimmed focus-visible:outline-primary-text focus-visible:-outline-offset-2 max-sm:flex max-sm:flex-wrap max-sm:gap-x-3 max-sm:px-4 md:grid-cols-12"
                  >
                    <span className="col-span-4 flex min-w-0 items-center gap-3 max-sm:order-1 max-sm:flex-1 max-sm:gap-2">
                      <ProviderLogo
                        provider={channel.key}
                        decorative
                        className="size-9 shrink-0 max-sm:size-8"
                      />
                      <span className="wrap-anywhere min-w-0 font-medium text-base text-foreground-rich group-hover:text-primary-text max-sm:text-sm">
                        {item.title}
                      </span>
                    </span>
                    <p className="col-span-full col-start-1 row-start-2 min-w-0 pl-12 text-foreground-dimmed text-sm leading-relaxed max-sm:order-3 max-sm:basis-full max-sm:pl-10 md:col-span-6 md:col-start-5 md:row-start-1 md:pl-0">
                      {item.body}
                    </p>
                    <span className="wrap-anywhere max-sm:wrap-normal col-span-2 col-start-5 row-start-1 min-w-0 justify-self-end text-right max-sm:order-2 max-sm:max-w-28 max-sm:shrink-0 md:col-start-11">
                      <MarketingStatus status={channel.status}>
                        {item.statusLabel}
                      </MarketingStatus>
                    </span>
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
