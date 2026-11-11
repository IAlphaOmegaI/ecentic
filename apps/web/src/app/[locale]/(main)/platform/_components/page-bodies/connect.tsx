import {
  CommerceBasketShoppingIcon,
  CommerceCityBuildingIcon,
  CommerceCode_3Icon,
  CommerceFileShieldIcon,
  CommerceGlobePointerIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { getMessages } from "next-intl/server";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingBand,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { TrackingOverview } from "@/components/marketing/tracking-overview";
import { Plus } from "@/components/plus";
import { ConnectProblem } from "./connect-problem";
import { ConnectRoadmap } from "./connect-roadmap";
import { ConnectSources } from "./connect-sources";

const sourceIds = [
  "shopify",
  "woocommerce",
  "product-feeds",
  "csv",
  "store-address",
  "merchant-center",
] as const;

const problemIcons = [
  CommerceCode_3Icon,
  CommerceGlobePointerIcon,
  CommercePlug_3SparkleIcon,
];
const controlIcons = [
  CommerceBasketShoppingIcon,
  CommerceFileShieldIcon,
  CommerceCityBuildingIcon,
];

export const ConnectBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const sources = sections.filter((section) =>
    sourceIds.some((source) => source === section.id),
  );
  const workflow = sections.find((section) => section.id === "how-it-works");
  const { reviewConnect } = await getMessages();

  return (
    <>
      {sections.map((section) => {
        switch (section.id) {
          case "problem":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&_.marketing-guides]:hidden"
              >
                <div className="grid min-w-0 lg:grid-cols-2">
                  <div className="min-w-0">
                    <MarketingHeading
                      eyebrow={section.eyebrow}
                      title={section.title}
                      description={section.description}
                    />
                    <ConnectProblem copy={reviewConnect.problem} />
                  </div>
                  <div className="relative grid border-accent-foreground border-t lg:border-t-0 lg:border-l">
                    <Plus className="top-0 left-0 size-4 -translate-x-1/2 -translate-y-1/2" />
                    {section.items?.map((item, index) => {
                      const Icon = problemIcons[index] ?? CommerceCode_3Icon;
                      return (
                        <article
                          key={item.title}
                          className="grid grid-cols-[40px_1fr] items-start gap-6 border-accent-foreground border-b px-8 py-10 last:border-b-0 max-sm:px-4"
                        >
                          <Icon aria-hidden className="size-10 text-primary" />
                          <div className="min-w-0">
                            <h3>{item.title}</h3>
                            <p className="mt-2 text-foreground-dimmed">
                              {item.body}
                            </p>
                          </div>
                        </article>
                      );
                    })}
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
                <ConnectRoadmap
                  items={section.items ?? []}
                  label={section.title}
                  copy={reviewConnect.flow}
                />
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
                  {section.items?.map((item, index) => {
                    const Icon =
                      controlIcons[index] ?? CommerceBasketShoppingIcon;
                    return (
                      <article
                        key={item.title}
                        className="min-w-0 border-[var(--rail-color)] border-b px-8 py-8 last:border-b-0 max-sm:px-4 md:border-r md:border-b-0 md:last:border-r-0"
                      >
                        <Icon
                          aria-hidden
                          className="mb-6 size-10 text-primary"
                        />
                        <h3>{item.title}</h3>
                        <p className="mt-4 text-foreground-dimmed">
                          {item.body}
                        </p>
                      </article>
                    );
                  })}
                </div>
                {sectionChildren?.[section.id]}
              </MarketingBand>
            );
          case "what-to-track":
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
                />
                <TrackingOverview
                  items={section.items ?? []}
                  label={section.title}
                />
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
