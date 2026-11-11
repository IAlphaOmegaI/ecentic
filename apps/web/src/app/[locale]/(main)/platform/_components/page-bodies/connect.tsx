import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingBand,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { ConnectSources } from "./connect-sources";

const sourceIds = [
  "shopify",
  "woocommerce",
  "product-feeds",
  "csv",
  "store-address",
  "merchant-center",
] as const;

export const ConnectBody = ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const sources = sections.filter((section) =>
    sourceIds.some((source) => source === section.id),
  );
  const workflow = sections.find((section) => section.id === "how-it-works");
  const control = sections.find((section) => section.id === "why-it-works");

  return (
    <>
      {sections.map((section) => {
        switch (section.id) {
          case "problem":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail]:bg-background-dimmed [&_.marketing-guides]:hidden"
              >
                <div className="grid min-w-0 lg:grid-cols-2">
                  <MarketingHeading
                    eyebrow={section.eyebrow}
                    title={section.title}
                    description={section.description}
                  />
                  <div className="border-[var(--rail-color)] border-t px-8 py-4 max-sm:px-4 lg:border-t-0 lg:border-l">
                    {section.items?.map((item, index) => (
                      <article
                        key={item.title}
                        className="grid grid-cols-[32px_1fr] gap-4 border-[var(--rail-color)] border-b py-6 last:border-b-0"
                      >
                        <span
                          aria-hidden="true"
                          className="pt-1 text-primary-text text-xl"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <h3>{item.title}</h3>
                          <p className="mt-2 text-foreground-dimmed">
                            {item.body}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
                {sectionChildren?.[section.id]}
              </MarketingBand>
            );
          case "how-it-works":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&_.marketing-guides]:hidden"
              >
                <MarketingHeading
                  eyebrow={section.eyebrow}
                  title={section.title}
                  description={section.description}
                  className="pb-8"
                />
                <div className="grid min-w-0 border-[var(--rail-color)] border-t lg:grid-cols-[7fr_5fr]">
                  <ol className="m-0 list-none px-8 py-8 max-sm:px-4">
                    {section.items?.map((item, index) => (
                      <li
                        key={item.title}
                        className="relative grid grid-cols-[40px_1fr] gap-4 pb-8 before:absolute before:top-10 before:bottom-2 before:left-4 before:border-primary/25 before:border-l last:pb-0 last:before:hidden"
                      >
                        <span
                          aria-hidden="true"
                          className="font-heading text-3xl text-primary-text leading-none"
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <h3>{item.title}</h3>
                          <p className="mt-2 max-w-[50ch] text-foreground-dimmed">
                            {item.body}
                          </p>
                          {index === 0 && (
                            <div className="mt-6 flex items-center gap-8">
                              <ProviderLogo
                                provider="shopify"
                                className="h-8 max-w-28 rounded-none"
                              />
                              <ProviderLogo
                                provider="woocommerce"
                                className="h-8 max-w-28 rounded-none"
                              />
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="min-w-0 border-[var(--rail-color)] border-t p-3 max-sm:p-2 lg:border-t-0 lg:border-l">
                    <div className="flex h-full min-h-72 flex-col justify-center overflow-hidden bg-primary text-background-rich">
                      <div className="h-64 min-w-0 px-6 lg:h-80">
                        <EvolvingAscii artwork="bag" />
                      </div>
                      <p className="mx-auto max-w-[26ch] px-6 pt-4 pb-10 text-center font-heading text-2xl leading-snug">
                        {control?.items?.[1]?.body}
                      </p>
                    </div>
                  </div>
                </div>
                {sectionChildren?.[section.id]}
              </MarketingBand>
            );
          case "why-it-works":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&_.marketing-guides]:hidden"
              >
                <MarketingHeading
                  eyebrow={section.eyebrow}
                  title={section.title}
                  description={section.description}
                  className="pb-8"
                />
                <div className="grid border-[var(--rail-color)] border-t md:grid-cols-3">
                  {section.items?.map((item) => (
                    <article
                      key={item.title}
                      className="min-w-0 border-[var(--rail-color)] border-b px-8 py-8 last:border-b-0 max-sm:px-4 md:border-r md:border-b-0 md:last:border-r-0"
                    >
                      <h3>{item.title}</h3>
                      <p className="mt-4 text-foreground-dimmed">{item.body}</p>
                    </article>
                  ))}
                </div>
                {sectionChildren?.[section.id]}
              </MarketingBand>
            );
          case "what-to-track":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail]:bg-background-dimmed [&_.marketing-guides]:hidden"
              >
                <div className="grid min-w-0 lg:grid-cols-[5fr_7fr]">
                  <MarketingHeading
                    eyebrow={section.eyebrow}
                    title={section.title}
                    description={section.description}
                  />
                  <dl className="m-0 border-[var(--rail-color)] border-t px-8 py-4 max-sm:px-4 lg:border-t-0 lg:border-l">
                    {section.items?.map((item) => (
                      <div
                        key={item.title}
                        className="grid gap-2 border-[var(--rail-color)] border-b py-6 last:border-b-0 sm:grid-cols-[1fr_1.3fr] sm:gap-6"
                      >
                        <dt className="font-medium text-foreground-rich">
                          {item.title}
                        </dt>
                        <dd className="m-0 text-foreground-dimmed">
                          {item.body}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
                {sectionChildren?.[section.id]}
              </MarketingBand>
            );
          case "shopify":
            return (
              <div key="sources">
                <SectionGutter />
                <MarketingBand className="[&_.marketing-guides]:hidden">
                  <div className="grid min-w-0 lg:grid-cols-[5fr_7fr]">
                    <div className="min-w-0 px-8 py-12 max-sm:px-4 max-sm:py-8">
                      <h2>{workflow?.items?.[0]?.title}</h2>
                      <p className="mt-4 max-w-[36ch] text-foreground-dimmed">
                        {workflow?.items?.[0]?.body}
                      </p>
                    </div>
                    <ConnectSources
                      sections={sources}
                      sectionChildren={sectionChildren}
                    />
                  </div>
                </MarketingBand>
              </div>
            );
          case "woocommerce":
          case "product-feeds":
          case "csv":
          case "store-address":
          case "merchant-center":
            return null;
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
