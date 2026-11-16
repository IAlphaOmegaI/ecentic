import {
  CommerceBasketShoppingIcon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommerceGlobePointerIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import type { AppConfig } from "next-intl";
import { MarketingLead } from "@/components/marketing/lead";
import { MarketingStatus } from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { integrationGroups, integrations } from "@/content/integrations";
import { Link } from "@/i18n/navigation";
import {
  IntegrationAccordion,
  IntegrationCategory,
} from "./integration-accordion";

const groups = {
  commerce: CommerceBasketShoppingIcon,
  feeds: CommerceFilePenIcon,
  channels: CommerceGlobePointerIcon,
  payments: CommercePlug_3SparkleIcon,
  pim: CommerceCode_3Icon,
} as const;

const symbols = {
  productFeeds: CommerceFilePenIcon,
  csv: CommerceCode_3Icon,
  storeAddress: CommerceGlobePointerIcon,
  paymentGateway: CommercePlug_3SparkleIcon,
} as const;

export const IntegrationsPreview = ({ copy }: IntegrationsPreview.Props) => (
  <IntegrationAccordion>
    {integrationGroups.map((group) => {
      const entries = integrations.filter((item) => item.group === group);
      const Icon = groups[group];
      if (!entries.length) return null;
      return (
        <IntegrationCategory
          key={group}
          value={group}
          title={copy.groups[group]}
          mark={<Icon aria-hidden className="size-10 shrink-0 text-primary" />}
        >
          <div
            className="enterprise-provider-grid marketing-grid marketing-section-grid grid grid-cols-1 border-[var(--rail-color)] border-t sm:grid-cols-2 lg:grid-cols-4"
            data-columns="4"
          >
            {entries.map((item) => {
              const Mark =
                item.key in symbols
                  ? symbols[item.key as keyof typeof symbols]
                  : null;
              return (
                <article
                  key={item.key}
                  className="relative grid h-auto min-h-0 w-full min-w-0 items-start gap-4 border-[var(--rail-color)] border-r border-b bg-background p-6 max-sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] max-sm:items-center max-sm:border-r-0 max-sm:p-4 max-sm:last:border-b-0 sm:aspect-square sm:grid-rows-[3rem_3.5rem_1.5rem_minmax(0,1fr)] sm:max-lg:even:border-r-0 lg:max-xl:gap-2 lg:max-xl:p-4 sm:max-lg:[&:nth-child(2n+1):nth-last-child(-n+2)]:border-b-0 sm:max-lg:[&:nth-child(2n+1):nth-last-child(-n+2)~article]:border-b-0 lg:[&:nth-child(4n+1):nth-last-child(-n+4)]:border-b-0 lg:[&:nth-child(4n+1):nth-last-child(-n+4)~article]:border-b-0"
                >
                  <div className="enterprise-integration-mark flex h-12 shrink-0 items-center max-sm:col-start-1 max-sm:row-start-1 max-sm:h-10">
                    {Mark ? (
                      <Mark
                        aria-hidden
                        className="size-10 text-primary max-sm:size-8"
                      />
                    ) : (
                      <ProviderLogo
                        provider={item.key}
                        decorative
                        fallback="none"
                        className="h-10 max-w-36 max-sm:h-8 max-sm:w-10"
                      />
                    )}
                  </div>
                  <Link
                    href={item.href}
                    className="wrap-anywhere min-w-0 font-medium text-foreground-rich text-lg leading-snug hover:text-primary-text max-sm:col-start-2 max-sm:row-start-1 max-sm:text-base max-sm:after:absolute max-sm:after:inset-0"
                  >
                    {copy.entries[item.key].name}
                  </Link>
                  <div className="max-sm:col-start-3 max-sm:row-start-1 max-sm:whitespace-nowrap">
                    <MarketingStatus status={item.status}>
                      {copy.statuses[item.status]}
                    </MarketingStatus>
                  </div>
                  {item.interests.length > 0 && (
                    <div className="relative flex min-h-12 flex-wrap gap-2 self-end pt-2 max-sm:z-1 max-sm:col-span-2 max-sm:col-start-2 max-sm:min-h-0 max-sm:pt-0">
                      {item.interests.map((topic) => (
                        <MarketingLead
                          key={topic}
                          kind="interest"
                          topic={topic}
                          title={copy.interests[topic]}
                          triggerLabel={copy.action.primary}
                        />
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </IntegrationCategory>
      );
    })}
  </IntegrationAccordion>
);

export namespace IntegrationsPreview {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseIntegrations"];
  };
}
