import { CommercePlug_3SparkleIcon } from "@zenncore/icons";
import type { AppConfig } from "next-intl";
import { MarketingLead } from "@/components/marketing/lead";
import { MarketingStatus } from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { integrationGroups, integrations } from "@/content/integrations";
import { Link } from "@/i18n/navigation";

export const IntegrationsPreview = ({
  copy,
}: {
  copy: AppConfig["Messages"]["enterpriseIntegrations"];
}) => {
  return (
    <div className="enterprise-integrations-wall">
      {integrationGroups.map((group) => {
        const entries = integrations.filter((item) => item.group === group);
        if (!entries.length) return null;
        return (
          <div key={group} className="enterprise-integration-row">
            <h3>{copy.groups[group]}</h3>
            <div>
              {entries.map((item) => (
                <article key={item.key}>
                  <div className="enterprise-integration-mark">
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
