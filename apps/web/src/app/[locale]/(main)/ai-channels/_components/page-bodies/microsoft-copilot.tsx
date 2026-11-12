import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getMessages } from "next-intl/server";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { ConnectedJourney } from "@/components/marketing/connected-journey";
import { MarketingSection } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Link } from "@/i18n/navigation";
import { ChannelWorkbench } from "../channel-content";

type Section = MarketingBodyProps["sections"][number];
type Copy = Awaited<ReturnType<typeof getMessages>>["microsoftCopilotPage"];

const routes = [
  { key: "microsoft", provider: "microsoft" },
  { key: "shopify", provider: "shopify" },
  { key: "stripe", provider: "stripeAcs" },
] as const;

const ShoppingWorkbench = ({
  sections,
  copy,
}: {
  sections: readonly Section[];
  copy: Copy["journey"];
}) => (
  <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden">
    <div className="px-8 py-12 max-sm:px-4 max-sm:py-8">
      <h2>{copy.title}</h2>
    </div>
    <div className="grid min-w-0 border-accent-foreground border-t bg-background-dimmed lg:grid-cols-[0.9fr_1.1fr]">
      <div className="flex min-w-0 flex-col border-accent-foreground max-lg:border-b lg:border-r">
        <div className="flex items-center justify-between gap-8 px-8 pt-8 max-sm:px-4">
          <ProviderLogo
            provider="copilot"
            decorative
            className="h-16 w-auto rounded-none"
          />
          <p className="max-w-48 text-right text-foreground-dimmed text-sm">
            {copy.copilot}
          </p>
        </div>
        <CommerceFigure
          kind="workflow"
          surface="field"
          className="aspect-auto h-64 w-full sm:h-80 lg:flex-1"
        />
        <div className="border-accent-foreground border-t px-8 py-6 max-sm:px-4">
          <p className="font-medium text-foreground-rich">{copy.merchant}</p>
          <p className="mt-2 text-foreground-dimmed text-sm">
            {copy.relationship}
          </p>
        </div>
      </div>
      <ConnectedJourney
        label={copy.dataLabel}
        className="border-t-0"
        items={sections.map((section) => ({
          id: section.id,
          anchor: section.id,
          title: section.title,
          icon: section.id === "shops" ? "checkout" : "catalog",
          content: (
            <div className="px-8 pb-8 max-sm:px-4">
              <p className="max-w-[48ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                {section.description}
              </p>
              {section.id === "reads" && (
                <div className="mt-8 border-accent-foreground border-t">
                  <div className="grid grid-cols-2 divide-x divide-accent-foreground">
                    <p className="py-4 pr-4 text-sm">{copy.web}</p>
                    <p className="py-4 pl-4 text-sm">{copy.feeds}</p>
                  </div>
                  <div className="flex items-center gap-4 border-accent-foreground border-t pt-4 text-primary-text">
                    <ArrowRightIcon
                      className="size-4 shrink-0 rotate-90"
                      aria-hidden="true"
                    />
                    <p className="text-sm">{copy.checkout}</p>
                  </div>
                </div>
              )}
            </div>
          ),
        }))}
      />
    </div>
  </MarketingBand>
);

const MerchantEntry = ({
  section,
  copy,
}: {
  section: Section;
  copy: Copy["entry"];
}) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="grid gap-8 px-8 py-12 max-sm:px-4 max-sm:py-8 lg:grid-cols-[0.9fr_1.1fr]">
      <h2>{section.title}</h2>
      <p className="max-w-[60ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
        {section.description}
      </p>
    </div>
    <dl className="grid grid-cols-3 border-accent-foreground border-t bg-background-dimmed">
      {(["language", "buyers", "currency"] as const).map((field) => (
        <div
          key={field}
          className="min-w-0 border-accent-foreground border-r px-8 py-6 last:border-r-0 max-sm:px-4"
        >
          <dt className="text-foreground-dimmed text-sm">{copy[field]}</dt>
          <dd className="mt-2 font-medium text-foreground-rich text-lg max-sm:text-base">
            {copy[`${field}Value`]}
          </dd>
        </div>
      ))}
    </dl>
    <div className="px-8 py-8 max-sm:px-4 max-sm:py-6">
      <p className="text-foreground-dimmed text-sm">{copy.label}</p>
    </div>
    <ConnectedJourney
      label={copy.label}
      items={routes.map((route) => ({
        id: route.key,
        title: copy[route.key],
        icon:
          route.key === "microsoft"
            ? "website"
            : route.key === "shopify"
              ? "catalog"
              : "checkout",
        content: (
          <div className="grid min-w-0 border-accent-foreground border-t bg-background-dimmed md:grid-cols-[0.9fr_1.1fr]">
            <div className="flex min-w-0 flex-col justify-between gap-8 border-accent-foreground px-8 py-8 max-sm:px-4 max-md:border-b md:border-r">
              <ProviderLogo
                provider={route.provider}
                decorative
                className="h-16 w-auto max-w-56 self-start rounded-none object-left"
              />
              <h3 className="max-w-[22ch]">{copy.routes[route.key].title}</h3>
            </div>
            <div className="flex min-h-72 min-w-0 flex-col justify-between gap-8 px-8 py-8 max-sm:px-4">
              <p className="max-w-[48ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                {copy.routes[route.key].description}
              </p>
              <p className="border-accent-foreground border-t pt-6 text-foreground text-sm leading-relaxed">
                {copy.routes[route.key].note}
              </p>
            </div>
          </div>
        ),
      }))}
    />
    <div className="border-accent-foreground border-t px-8 py-6 max-sm:px-4 [&_a]:max-w-full [&_a]:whitespace-normal [&_a]:text-left [&_button]:max-w-full">
      <Button
        color="neutral"
        render={
          <Link href="https://about.ads.microsoft.com/en/solutions/technology/agentic-commerce" />
        }
      >
        {copy.action.primary}
        <ArrowRightIcon className="size-4 shrink-0" aria-hidden="true" />
      </Button>
    </div>
  </MarketingBand>
);

export const MicrosoftCopilotBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { microsoftCopilotPage: copy } = await getMessages();
  const shopping = sections.filter((section) =>
    ["shops", "reads"].includes(section.id),
  );
  const remaining = sections.filter(
    (section) => !["shops", "reads"].includes(section.id),
  );

  return (
    <>
      <ShoppingWorkbench sections={shopping} copy={copy.journey} />
      {remaining.map((section) => (
        <Fragment key={section.id}>
          <SectionGutter />
          {section.id === "entry" ? (
            <MerchantEntry section={section} copy={copy.entry} />
          ) : section.id === "ecentic" ? (
            <ChannelWorkbench section={section}>
              {sectionChildren?.[section.id]}
            </ChannelWorkbench>
          ) : (
            <MarketingSection
              section={{ ...section, field: section.id === "next" }}
            >
              {sectionChildren?.[section.id]}
            </MarketingSection>
          )}
        </Fragment>
      ))}
    </>
  );
};
