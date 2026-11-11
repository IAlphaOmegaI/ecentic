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
  <div className="enterprise-integrations-wall border-[var(--rail-color)] border-b">
    {integrationGroups.map((group) => {
      const entries = integrations.filter((item) => item.group === group);
      const Icon = groups[group];
      if (!entries.length) return null;
      return (
        <div
          key={group}
          className="enterprise-integration-row marketing-section-grid grid grid-cols-[220px_minmax(0,1fr)] border-[var(--rail-color)] border-t max-sm:grid-cols-1 max-[1001px]:grid-cols-[160px_minmax(0,1fr)]"
        >
          <h3 className="flex flex-col items-start gap-4 p-6 font-body text-[15px] leading-normal tracking-normal max-sm:flex-row max-sm:items-center max-sm:border-[var(--rail-color)] max-sm:border-b max-sm:px-4 max-sm:py-6">
            <Icon aria-hidden className="size-8 shrink-0 text-primary" />
            {copy.groups[group]}
          </h3>
          <div className="grid grid-cols-3 max-[1001px]:grid-cols-2">
            {entries.map((item) => {
              const Mark =
                item.key in symbols
                  ? symbols[item.key as keyof typeof symbols]
                  : null;
              return (
                <article
                  key={item.key}
                  className="flex min-w-0 flex-col items-start gap-4 border-[var(--rail-color)] border-l p-6 max-sm:px-4 max-sm:py-6 max-sm:odd:border-l-0 max-[1001px]:nth-[n+3]:border-t min-[1001px]:nth-[n+4]:border-t"
                >
                  <div className="enterprise-integration-mark flex h-10 items-center">
                    {Mark ? (
                      <Mark aria-hidden className="size-8 text-primary" />
                    ) : (
                      <ProviderLogo
                        provider={item.key}
                        fallback="none"
                        className="h-8 max-w-32"
                      />
                    )}
                  </div>
                  <Link
                    href={item.href}
                    className="font-medium text-foreground-rich text-lg leading-snug hover:text-primary-text max-sm:text-base"
                  >
                    {copy.entries[item.key].name}
                  </Link>
                  <MarketingStatus status={item.status}>
                    {copy.statuses[item.status]}
                  </MarketingStatus>
                  {item.interests.length > 0 && (
                    <div className="mt-auto flex flex-wrap gap-2 pt-2">
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
        </div>
      );
    })}
  </div>
);

export namespace IntegrationsPreview {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseIntegrations"];
  };
}
