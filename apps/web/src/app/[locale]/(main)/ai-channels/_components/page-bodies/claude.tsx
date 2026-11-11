import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import { getMessages } from "next-intl/server";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { MarketingSection } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { ChannelWorkbench } from "../channel-content";

type Section = MarketingBodyProps["sections"][number];
type Copy = Awaited<ReturnType<typeof getMessages>>["claudePage"];
const figures = ["catalog", "inspection", "checkout"] as const;

const Heading = ({ section }: { section: Section }) => (
  <div className="px-8 pt-12 pb-8 max-sm:px-4 max-sm:pt-8">
    <h2>{section.title}</h2>
    {section.description && (
      <p className="mt-4 max-w-[70ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
        {section.description}
      </p>
    )}
  </div>
);

const CommerceExplorer = ({ copy }: { copy: Copy["explorer"] }) => (
  <Tabs defaultValue="catalog" className="min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-4 px-8 pb-8 max-sm:px-4">
      <TabsList aria-label={copy.label} className="max-w-full">
        {copy.stages.map((stage) => (
          <Tab
            key={stage.id}
            value={stage.id}
            className="h-auto min-h-12 px-4 py-2 text-base data-active:bg-primary data-selected:bg-primary max-sm:text-sm"
          >
            {stage.title}
          </Tab>
        ))}
      </TabsList>
      <p className="text-foreground-dimmed text-sm">{copy.scope}</p>
    </div>
    {copy.stages.map((stage, index) => (
      <TabsPanel key={stage.id} value={stage.id}>
        <div className="grid gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[1fr_1.15fr]">
          <div className="relative flex min-w-0 flex-col justify-between bg-background-dimmed px-8 py-8 max-sm:px-4">
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-md:hidden" />
            <div>
              <p className="text-foreground-dimmed text-sm">{copy.tools}</p>
              <ul className="mt-4 grid grid-cols-2 gap-4 text-foreground">
                {stage.tools.map((tool) => (
                  <li
                    key={tool}
                    className="border-accent-foreground border-l pl-4"
                  >
                    {tool}
                  </li>
                ))}
              </ul>
            </div>
            <CommerceFigure
              kind={figures[index] ?? "catalog"}
              surface="field"
              className="mt-6 aspect-auto h-64 w-full md:h-80"
            />
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-8 bg-background px-8 py-10 max-sm:px-4">
            <ProviderLogo
              provider="claude"
              decorative
              className="size-16 rounded-none"
            />
            <div>
              <h3>{stage.headline}</h3>
              <p className="mt-4 max-w-[48ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                {stage.body}
              </p>
            </div>
          </div>
        </div>
      </TabsPanel>
    ))}
  </Tabs>
);

const ReadingBoundary = ({
  section,
  copy,
}: {
  section: Section;
  copy: Copy["reading"];
}) => (
  <>
    <div className="px-8 pt-12 pb-8 max-sm:px-4 max-sm:pt-8">
      <h2>{section.title}</h2>
    </div>
    <div className="grid gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
      {section.description?.split(/(?<=[.!?])\s+/u).map((paragraph, index) => (
        <div
          key={paragraph}
          className="min-w-0 bg-background-dimmed px-8 py-8 max-sm:px-4"
        >
          <h3>{index === 0 ? copy.merchant : copy.simulation}</h3>
          <p className="mt-4 max-w-[48ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
            {paragraph}
          </p>
        </div>
      ))}
    </div>
  </>
);

const MerchantEntry = ({
  section,
  copy,
}: {
  section: Section;
  copy: Copy["entry"];
}) => (
  <>
    <Heading section={section} />
    <div className="grid gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[1fr_auto_1fr]">
      <div className="flex items-center gap-4 bg-background-dimmed px-8 py-8 max-sm:px-4">
        <p className="text-lg">{copy.tools}</p>
        <ArrowRightIcon
          aria-hidden
          className="ml-auto size-4 shrink-0 text-primary max-md:rotate-90"
        />
      </div>
      <div className="flex items-center gap-4 bg-background-dimmed px-8 py-8 max-sm:px-4">
        <ProviderLogo
          provider="claude"
          decorative
          className="size-12 rounded-none"
        />
        <p className="font-medium text-lg">Claude</p>
      </div>
      <div className="flex items-center gap-4 bg-background-dimmed px-8 py-8 max-sm:px-4">
        <ArrowRightIcon
          aria-hidden
          className="size-4 shrink-0 text-primary max-md:rotate-90"
        />
        <p className="text-lg">{copy.experience}</p>
      </div>
    </div>
  </>
);

export const ClaudeBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { claudePage: copy } = await getMessages();

  return (
    <>
      {sections.map((section) => (
        <Fragment key={section.id}>
          {section.id !== "shops" && <SectionGutter />}
          {(() => {
            switch (section.id) {
              case "shops":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <Heading section={section} />
                    <CommerceExplorer copy={copy.explorer} />
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "reads":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <ReadingBoundary section={section} copy={copy.reading} />
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "entry":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <MerchantEntry section={section} copy={copy.entry} />
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "ecentic":
                return (
                  <ChannelWorkbench section={section}>
                    {sectionChildren?.[section.id]}
                  </ChannelWorkbench>
                );
              case "next":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <Heading section={section} />
                    <div className="flex flex-wrap gap-4 px-8 pb-12 max-sm:px-4 max-sm:pb-8">
                      <Button render={<Link href="/platform/simulate" />}>
                        {copy.action.primary}
                        <ArrowRightIcon aria-hidden className="size-4" />
                      </Button>
                      <Button
                        color="neutral"
                        render={<Link href="/platform/fix" />}
                      >
                        {copy.action.secondary}
                      </Button>
                    </div>
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
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
