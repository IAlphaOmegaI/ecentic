import { CommercePlug_3SparkleIcon } from "@zenncore/icons";
import type { AppConfig } from "next-intl";
import { MarketingLead } from "@/components/marketing/lead";
import { MarketingStatus } from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { integrationGroups, integrations } from "@/content/integrations";
import { Link } from "@/i18n/navigation";

export const IntegrationsPreview = ({ copy }: IntegrationsPreview.Props) => {
  return (
    <div className="enterprise-integrations-wall border-[var(--rail-color)] border-b">
      {integrationGroups.map((group) => {
        const entries = integrations.filter((item) => item.group === group);
        if (!entries.length) return null;
        return (
          <div
            key={group}
            className="enterprise-integration-row [&_article>.marketing-status]:text-(length:--text-xs) [&_article>a]:text-(length:--text-lg) grid grid-cols-[220px_minmax(0,1fr)] border-[var(--rail-color)] border-t max-sm:grid-cols-1 max-[1001px]:grid-cols-[160px_minmax(0,1fr)] [&>div]:grid [&>div]:grid-cols-3 max-[1001px]:[&>div]:grid-cols-2 [&>h3]:p-7 [&>h3]:font-body [&>h3]:text-[15px] [&>h3]:leading-normal [&>h3]:tracking-normal max-sm:[&>h3]:border-[var(--rail-color)] max-sm:[&>h3]:border-b max-sm:[&>h3]:px-4 max-sm:[&>h3]:py-[22px] max-[1001px]:[&_article:nth-child(n+3)]:border-t [&_article:nth-child(n+4)]:border-t max-sm:[&_article:nth-child(odd)]:border-l-0 [&_article>a]:font-medium [&_article>a]:text-foreground-rich [&_article>a]:leading-[1.3] max-sm:[&_article>a]:text-[15px] [&_article>button]:justify-start [&_article>button]:p-0 [&_article>button]:text-[13px] [&_article>button]:text-primary-text [&_article]:flex [&_article]:min-w-0 [&_article]:flex-col [&_article]:gap-[18px] [&_article]:border-[var(--rail-color)] [&_article]:border-l [&_article]:p-7 max-sm:[&_article]:px-4 max-sm:[&_article]:py-[22px]"
          >
            <h3>{copy.groups[group]}</h3>
            <div>
              {entries.map((item) => (
                <article key={item.key}>
                  <div className="enterprise-integration-mark flex h-9 items-center [&_img]:h-9 [&_img]:w-auto [&_img]:max-w-[136px] [&_img]:object-contain">
                    {item.display === "icon" ? (
                      <CommercePlug_3SparkleIcon
                        aria-hidden
                        className="size-7 text-primary"
                      />
                    ) : (
                      <ProviderLogo provider={item.key} fallback="none" />
                    )}
                  </div>
                  <Link href={item.href}>{copy.entries[item.key].name}</Link>
                  <MarketingStatus status={item.status}>
                    {copy.statuses[item.status]}
                  </MarketingStatus>
                  {item.interests.map((topic) => (
                    <MarketingLead
                      key={topic}
                      kind="interest"
                      topic={topic}
                      title={copy.interests[topic]}
                    />
                  ))}
                </article>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export namespace IntegrationsPreview {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseIntegrations"];
  };
}
