import { ArrowRightIcon, CommerceCode_3Icon } from "@zenncore/icons";
import { getMessages } from "next-intl/server";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
} from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { SolutionFeatureBand } from "../feature-band";
import { BrandsJobs } from "./brands-jobs";

const providers = ["shopify", "woocommerce", "google"] as const;

export const BrandsBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { brandsPage, enterpriseSolutions } = await getMessages();
  const content = enterpriseSolutions.business.brands;

  return (
    <>
      {sections.map((section) => {
        switch (section.id) {
          case "challenges":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="px-4 py-10 sm:px-8 sm:py-12">
                  <h2>{section.title}</h2>
                  <p className="mt-4 max-w-[60ch] text-foreground-dimmed text-lg max-sm:text-base">
                    {brandsPage.jobs.description}
                  </p>
                </div>
                <BrandsJobs
                  jobs={brandsPage.jobs}
                  challenges={content.challenges}
                  link={content.challengeLabels.link}
                >
                  {sectionChildren?.[section.id]}
                </BrandsJobs>
              </MarketingBand>
            );
          case "integrations":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="px-4 py-10 sm:px-8 sm:py-12">
                  <h2>{section.title}</h2>
                  <p className="mt-4 max-w-[60ch] text-foreground-dimmed text-lg max-sm:text-base">
                    {brandsPage.sources.description}
                  </p>
                </div>
                <div className="relative grid gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
                  <Plus className="top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
                  {[brandsPage.sources.store, brandsPage.sources.catalog].map(
                    (label, group) => (
                      <div key={label} className="min-w-0 bg-background-dimmed">
                        <p className="px-4 py-6 text-foreground-dimmed sm:px-8">
                          {label}
                        </p>
                        {section.items
                          ?.slice(group * 2, group * 2 + 2)
                          .map((item, position) => {
                            const provider = providers[group * 2 + position];
                            return (
                              <Link
                                key={item.title}
                                href={item.href ?? "/integrations"}
                                className="group grid min-h-52 grid-cols-[1fr_auto] gap-x-4 border-accent-foreground border-t px-4 py-8 hover:bg-background focus-visible:-outline-offset-4 sm:px-8"
                              >
                                <div className="min-w-0">
                                  {provider ? (
                                    <ProviderLogo
                                      provider={provider}
                                      decorative
                                      className="mb-6 h-10 max-w-44 rounded-none"
                                    />
                                  ) : (
                                    <CommerceCode_3Icon
                                      aria-hidden
                                      className="mb-6 size-10 text-primary-text"
                                    />
                                  )}
                                  <h3 className="text-2xl! group-hover:text-primary-text">
                                    {item.title}
                                  </h3>
                                  <p className="mt-4 text-foreground-dimmed">
                                    {item.body}
                                  </p>
                                  <span className="mt-6 block text-primary-text text-sm">
                                    {item.label}
                                  </span>
                                </div>
                                <ArrowRightIcon
                                  aria-hidden
                                  className="mt-2 size-4 shrink-0 text-primary-text"
                                />
                              </Link>
                            );
                          })}
                      </div>
                    ),
                  )}
                </div>
                {sectionChildren?.[section.id]}
              </MarketingBand>
            );
          case "start":
            return (
              <MarketingBand key={section.id} id={section.id}>
                <div className="relative bg-background-dimmed px-4 py-10 sm:px-8 sm:py-12">
                  <h2>{section.title}</h2>
                  <p className="mt-4 max-w-[60ch] text-foreground-dimmed text-lg max-sm:text-base">
                    {section.description}
                  </p>
                  <MarketingActions actions={section.links ?? []} />
                  {sectionChildren?.[section.id]}
                </div>
              </MarketingBand>
            );
          case "one-product":
            return (
              <SolutionFeatureBand key={section.id} id={section.id}>
                <div className="px-4 py-10 sm:px-8 sm:py-12">
                  <p className="mb-4 text-primary-rich text-sm">
                    {section.eyebrow}
                  </p>
                  <h2>{section.title}</h2>
                </div>
                {sectionChildren?.[section.id]}
              </SolutionFeatureBand>
            );
          default:
            return (
              <MarketingSection key={section.id} section={section}>
                {sectionChildren?.[section.id]}
              </MarketingSection>
            );
        }
      })}
    </>
  );
};
