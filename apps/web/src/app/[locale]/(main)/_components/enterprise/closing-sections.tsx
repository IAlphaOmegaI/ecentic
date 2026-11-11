import {
  ArrowRightIcon,
  CommerceChartActivity_2Icon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { AppConfig } from "next-intl";
import { Suspense } from "react";
import {
  CatalogFindings,
  DuaEvidence,
  SimulationEvidence,
} from "@/components/marketing/measured-evidence";
import {
  MarketingActions,
  MarketingBand,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Link } from "@/i18n/navigation";
import { EditorialArticles } from "../../resources/_components/editorial-articles";
import { EditorialArticlesSkeleton } from "../../resources/_components/skeletons";

const safeguards = [
  { icon: CommerceFilePenIcon, color: "text-primary-text" },
  { icon: CommerceCode_3Icon, color: "text-secondary" },
  { icon: CommerceFileShieldIcon, color: "text-success" },
  { icon: CommerceChartActivity_2Icon, color: "text-warning" },
] as const;

const paths = [
  ["shopify", "woocommerce"],
  ["chatgpt", "claude", "gemini"],
  ["akeneo", "salsify", "plytix"],
] as const;

export const Findings = ({ copy }: Findings.Props) => (
  <MarketingBand id="proof" className="enterprise-proof">
    <MarketingHeading eyebrow={copy.eyebrow} title={copy.title} />
    <div className="marketing-section-grid grid gap-px border-accent-foreground border-y bg-accent-foreground">
      <SimulationEvidence />
      <CatalogFindings />
    </div>
    <DuaEvidence />
  </MarketingBand>
);

export namespace Findings {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["proof"];
  };
}

export const Procurement = ({ copy }: Procurement.Props) => (
  <MarketingBand id="enterprise" className="enterprise-procurement">
    <MarketingHeading eyebrow={copy.eyebrow} title={copy.title} />
    <div
      className="marketing-grid marketing-section-grid grid grid-cols-2 border-accent-foreground border-b max-sm:grid-cols-1"
      data-columns="2"
    >
      {copy.items.map((item, index) => {
        const safeguard = safeguards[index];
        const Icon = safeguard?.icon;
        return (
          <article
            key={item.title}
            className="min-w-0 border-accent-foreground border-t border-r bg-background-dimmed px-7 py-8 even:border-r-0 max-sm:border-r-0 max-sm:px-4"
          >
            {Icon && (
              <Icon
                aria-hidden
                className={cn("mb-6 size-8", safeguard.color)}
              />
            )}
            <h3>{item.title}</h3>
            <p className="mt-4 max-w-[54ch] text-foreground">{item.body}</p>
          </article>
        );
      })}
    </div>
    <div className="px-7 py-8 max-sm:px-4">
      <MarketingActions actions={copy.links} className="mt-0" />
    </div>
  </MarketingBand>
);

export namespace Procurement {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["procurement"];
  };
}

export const PricingPaths = ({ copy }: PricingPaths.Props) => (
  <MarketingBand
    id="pricing"
    className="bg-linear-to-br from-primary/10 via-background to-secondary/8 [&_.marketing-heading>p:last-child]:text-foreground"
  >
    <MarketingHeading
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
    />
    <div
      className="marketing-grid marketing-section-grid grid grid-cols-3 border-accent-foreground border-b max-sm:grid-cols-1"
      data-columns="3"
    >
      {copy.items.map((item, index) => (
        <article
          key={item.title}
          className="relative flex min-w-0 flex-col border-accent-foreground border-t border-r bg-linear-to-b from-background-rich/60 to-transparent px-7 py-8 last:border-r-0 max-sm:border-r-0 max-sm:px-4"
        >
          <div aria-hidden className="mb-8 flex h-12 items-center gap-4">
            {paths[index]?.map((provider) => (
              <div
                key={provider}
                className="relative flex size-12 items-center justify-center"
              >
                <ProviderLogo
                  provider={provider}
                  decorative
                  className="h-8 w-8 object-center"
                />
              </div>
            ))}
          </div>
          <h3>{item.title}</h3>
          <p className="mt-4 mb-8 text-foreground-dimmed">{item.body}</p>
          <div className="mt-auto">
            <Button render={<Link href={item.href} />}>
              {item.label}
              <ArrowRightIcon aria-hidden className="size-4" />
            </Button>
          </div>
        </article>
      ))}
    </div>
    <div className="px-7 py-8 max-sm:px-4">
      <MarketingActions actions={[copy.action]} className="mt-0" />
    </div>
  </MarketingBand>
);

export namespace PricingPaths {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["pricing"];
  };
}

export const Resources = ({ copy }: Resources.Props) => (
  <MarketingBand id="resources" className="relative overflow-hidden">
    <MarketingHeading
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
    />
    <Suspense fallback={<EditorialArticlesSkeleton label={copy.loading} />}>
      <EditorialArticles />
    </Suspense>
    <div className="px-7 py-8 max-sm:px-4">
      <MarketingActions actions={copy.links} className="mt-0" />
    </div>
  </MarketingBand>
);

export namespace Resources {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["editorial"];
  };
}
