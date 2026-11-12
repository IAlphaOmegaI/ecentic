import { ArrowRightIcon } from "@zenncore/icons";
import { getMessages } from "next-intl/server";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { JourneySteps } from "@/components/marketing/connected-journey";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingSection } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Plus } from "@/components/plus";
import { ChannelWorkbench } from "../channel-content";

type Section = MarketingBodyProps["sections"][number];
type Copy = Awaited<ReturnType<typeof getMessages>>["amazonPage"];

const Heading = ({ section }: { section: Section }) => (
  <div className="relative px-8 py-12 max-sm:px-4 max-sm:py-8">
    <h2>{section.title}</h2>
    {section.description && (
      <p className="mt-4 max-w-[70ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
        {section.description}
      </p>
    )}
  </div>
);

const PurchasePaths = ({ copy }: { copy: Copy["journey"] }) => (
  <JourneySteps
    layout="surface"
    label={copy.label}
    items={copy.paths.map((path) => ({
      id: path.id,
      title: path.title,
      icon: path.id === "visit" ? "website" : "checkout",
      content: (
        <div className="grid gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
          <div className="relative flex min-w-0 flex-col bg-background-dimmed px-8 pt-8 pb-6 max-sm:px-4">
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-md:hidden" />
            <div className="flex flex-wrap items-center justify-between gap-6">
              <p className="text-foreground-dimmed text-sm">{copy.discovery}</p>
              <ProviderLogo
                provider="amazon"
                decorative
                className="h-10 w-auto rounded-none"
              />
            </div>
            <p className="mt-6 max-w-[26ch] font-medium text-foreground-rich text-xl leading-snug">
              {copy.surface}
            </p>
            <div className="h-56 w-full text-primary sm:h-64">
              <EvolvingAscii artwork={path.id === "visit" ? "bag" : "cart"} />
            </div>
          </div>
          <div className="flex min-w-0 flex-col justify-between gap-8 bg-background px-8 py-8 max-sm:px-4">
            <div>
              <h3>{path.heading}</h3>
              <p className="mt-4 max-w-[46ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                {path.description}
              </p>
            </div>
            <ol className="space-y-6" aria-label={copy.label}>
              <li className="font-medium text-foreground-rich">{path.actor}</li>
              <li className="flex items-center gap-4 border-accent-foreground border-t pt-6">
                <ArrowRightIcon
                  aria-hidden
                  className="size-4 shrink-0 text-primary"
                />
                <span className="font-medium text-foreground-rich">
                  {copy.destination}
                </span>
              </li>
            </ol>
            <p className="text-foreground-dimmed text-sm">{path.condition}</p>
          </div>
        </div>
      ),
    }))}
  />
);

const CatalogPath = ({ copy }: { copy: Copy["catalog"] }) => (
  <div className="relative flex min-w-0 flex-col justify-center bg-background-dimmed px-8 py-10 max-sm:px-4">
    <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
    <p className="text-foreground-dimmed text-sm">{copy.label}</p>
    <ol className="mt-6 flex flex-col gap-4">
      {[copy.source, copy.route, copy.destination].map((label, index) => (
        <li key={label}>
          {index > 0 && (
            <ArrowRightIcon
              aria-hidden
              className="mb-4 size-4 rotate-90 text-foreground-dimmed"
            />
          )}
          <p className="max-w-[28ch] font-medium text-foreground-rich text-xl leading-snug">
            {label}
          </p>
        </li>
      ))}
    </ol>
  </div>
);

const AccessRequirements = ({ copy }: { copy: Copy["access"] }) => (
  <div className="grid gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[1fr_2fr]">
    <div className="relative min-w-0 bg-background-dimmed px-8 py-8 max-sm:px-4">
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-md:hidden" />
      <h3>{copy.title}</h3>
      <ul className="mt-8 space-y-4 text-foreground-dimmed">
        <li>{copy.market}</li>
        <li>{copy.eligibility}</li>
      </ul>
    </div>
    <JourneySteps
      label={copy.title}
      className="border-t-0"
      items={copy.steps.map((step, index) => ({
        id: step.id,
        title: step.title,
        icon: index === 0 ? "access" : index === 1 ? "catalog" : "checkout",
        content: (
          <p className="max-w-[58ch] text-foreground-dimmed leading-relaxed">
            {step.description}
          </p>
        ),
      }))}
    />
  </div>
);

export const AmazonBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { amazonPage: copy } = await getMessages();

  return (
    <>
      {sections.map((section) => (
        <Fragment key={section.id}>
          {(() => {
            switch (section.id) {
              case "shops":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <Heading section={section} />
                    <PurchasePaths copy={copy.journey} />
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "reads":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <div className="grid gap-px bg-accent-foreground md:grid-cols-2">
                      <div className="min-w-0 bg-background">
                        <Heading section={section} />
                      </div>
                      <CatalogPath copy={copy.catalog} />
                    </div>
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "entry":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <Heading section={section} />
                    <AccessRequirements copy={copy.access} />
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "ecentic":
                return (
                  <>
                    <SectionGutter />
                    <ChannelWorkbench section={section}>
                      {sectionChildren?.[section.id]}
                    </ChannelWorkbench>
                  </>
                );
              default:
                return (
                  <MarketingSection section={section}>
                    {sectionChildren?.[section.id]}
                  </MarketingSection>
                );
            }
          })()}
        </Fragment>
      ))}
    </>
  );
};
