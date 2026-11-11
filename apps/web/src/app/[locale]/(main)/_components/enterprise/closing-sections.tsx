import {
  ArrowRightIcon,
  CommerceChartActivity_2Icon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { AppConfig } from "next-intl";
import { Suspense } from "react";
import { EvidenceArtwork } from "@/components/marketing/animated-ascii";
import {
  CatalogFindings,
  DuaEvidence,
  MarketEvidence,
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
  CommerceFilePenIcon,
  CommerceCode_3Icon,
  CommerceFileShieldIcon,
  CommerceChartActivity_2Icon,
] as const;

const paths = [
  ["shopify", "woocommerce"],
  ["chatgpt", "claude", "gemini"],
  ["akeneo", "salsify", "plytix"],
] as const;

export const Findings = ({ copy }: Findings.Props) => (
  <MarketingBand id="proof" className="enterprise-proof">
    <MarketingHeading eyebrow={copy.eyebrow} title={copy.title} />
    <div className="marketing-section-grid grid gap-px border-accent-foreground border-y bg-accent-foreground lg:grid-cols-2 [&:has(>:only-child)]:grid-cols-1">
      <SimulationEvidence />
      <CatalogFindings />
    </div>
    <DuaEvidence />
    <MarketEvidence />
    <div className="space-y-2 px-7 py-6 text-foreground-dimmed text-xs max-sm:px-4">
      {copy.footnotes.map((note) => (
        <p key={note.marker}>
          <sup>{note.marker}</sup> {note.text}
        </p>
      ))}
    </div>
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
        const Icon = safeguards[index];
        return (
          <article
            key={item.title}
            className="min-w-0 border-accent-foreground border-t border-r bg-background-dimmed px-7 py-8 even:border-r-0 max-sm:border-r-0 max-sm:px-4"
          >
            {Icon && (
              <Icon aria-hidden className="mb-6 size-8 text-primary-text" />
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
  <MarketingBand id="pricing">
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
          className="flex min-w-0 flex-col border-accent-foreground border-t border-r px-7 py-8 last:border-r-0 max-sm:border-r-0 max-sm:px-4"
        >
          <div aria-hidden className="mb-8 flex h-12 items-center -space-x-2">
            {paths[index]?.map((provider) => (
              <div
                key={provider}
                className="relative flex size-12 items-center justify-center rounded-full border-2 border-background bg-background-rich px-2"
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
    <EvidenceArtwork
      kind="catalog"
      className="pointer-events-none absolute -top-8 right-8 hidden text-primary/15 lg:block"
    />
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
