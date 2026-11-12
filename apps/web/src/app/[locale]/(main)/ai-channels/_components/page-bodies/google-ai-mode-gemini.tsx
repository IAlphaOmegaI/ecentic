import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getMessages } from "next-intl/server";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { JourneySteps } from "@/components/marketing/connected-journey";
import { MarketingSection } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Link } from "@/i18n/navigation";
import { ChannelWorkbench } from "../channel-content";

type Section = MarketingBodyProps["sections"][number];
type Copy = Awaited<ReturnType<typeof getMessages>>["googleChannelPage"];

const SectionHeading = ({ section }: { section: Section }) => (
  <div className="px-8 pt-12 pb-8 max-sm:px-4 max-sm:pt-8">
    <h2>{section.title}</h2>
    {section.description && (
      <p className="mt-4 max-w-[70ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
        {section.description}
      </p>
    )}
  </div>
);

const ShoppingExplorer = ({ copy }: { copy: Copy["explorer"] }) => (
  <JourneySteps
    layout="surface"
    label={copy.label}
    items={copy.stages.map((stage) => ({
      id: stage.id,
      title: stage.label,
      icon:
        stage.id === "catalog"
          ? "catalog"
          : stage.id === "assistant"
            ? "compare"
            : "checkout",
      content: (
        <div className="grid border-accent-foreground border-t bg-background-dimmed md:grid-cols-[0.85fr_1.15fr]">
          <div className="relative flex min-h-80 min-w-0 flex-col overflow-hidden border-accent-foreground max-md:border-b md:border-r">
            <div className="flex items-center gap-4 px-8 pt-8 max-sm:px-4">
              {stage.id !== "checkout" && (
                <ProviderLogo
                  provider={stage.id === "assistant" ? "gemini" : "google"}
                  decorative
                  className="h-12 w-12 rounded-none"
                />
              )}
              <p className="font-medium text-foreground-rich text-lg">
                {stage.destination}
              </p>
            </div>
            <CommerceFigure
              kind={
                stage.id === "catalog"
                  ? "drawer"
                  : stage.id === "assistant"
                    ? "document"
                    : "checkout"
              }
              surface="field"
              className="my-auto aspect-auto h-64 w-full md:h-80"
            />
          </div>
          <div className="flex min-h-96 min-w-0 flex-col px-8 py-8 max-sm:min-h-0 max-sm:px-4">
            <h3 className="max-w-[25ch]">{stage.title}</h3>
            <p className="mt-4 max-w-[48ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
              {stage.description}
            </p>
            <ul className="mt-6 border-accent-foreground border-t">
              {stage.details.map((detail) => (
                <li
                  key={detail}
                  className="flex items-center gap-4 border-accent-foreground border-b py-4 text-foreground"
                >
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 bg-primary"
                  />
                  {detail}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-8">
              <Button
                color="neutral"
                render={
                  <Link href={stage.id === "catalog" ? "#reads" : "#entry"} />
                }
              >
                {stage.action.primary}
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      ),
    }))}
  />
);

const ProductData = ({ copy }: { copy: Copy["reading"] }) => (
  <div className="grid border-accent-foreground border-t md:grid-cols-[0.85fr_1.15fr]">
    <div className="flex flex-col justify-between gap-8 border-accent-foreground bg-background-dimmed px-8 py-8 max-sm:px-4 max-md:border-b md:border-r">
      <div>
        <ProviderLogo
          provider="google"
          decorative
          className="h-16 w-16 rounded-none"
        />
        <h3 className="mt-6 max-w-[18ch]">{copy.label}</h3>
      </div>
      <div>
        <Button
          color="neutral"
          render={<Link href="/integrations/google-merchant-center" />}
        >
          {copy.action.primary}
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </div>
    <dl className="min-w-0">
      {copy.rows.map((row) => (
        <div
          key={row.title}
          className="border-accent-foreground border-b px-8 py-6 last:border-b-0 max-sm:px-4"
        >
          <dt className="font-medium text-foreground-rich text-lg">
            {row.title}
          </dt>
          <dd className="mt-2 text-foreground-dimmed">
            {row.detail}
            <span className="mt-2 block font-mono text-sm [overflow-wrap:anywhere]">
              {row.field}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  </div>
);

const MerchantEntry = ({
  section,
  copy,
}: {
  section: Section;
  copy: Copy["entry"];
}) => {
  const paragraphs = section.description?.split(/(?<=[.!?])\s+/u) ?? [];

  return (
    <>
      <div className="px-8 pt-12 pb-8 max-sm:px-4 max-sm:pt-8">
        <h2>{section.title}</h2>
      </div>
      <JourneySteps
        label={copy.label}
        items={copy.steps.map((step, index) => ({
          id: `entry-${index}`,
          title: step,
          icon: index === 0 ? "access" : index === 1 ? "catalog" : "checkout",
          content: (
            <p className="max-w-[65ch] text-foreground-dimmed leading-relaxed">
              {paragraphs[index]}
            </p>
          ),
        }))}
      />
      <div className="flex flex-wrap items-center justify-between gap-8 border-accent-foreground border-t bg-background-dimmed px-8 py-8 max-sm:px-4">
        <p className="max-w-[65ch] text-foreground-dimmed leading-relaxed">
          {copy.note}
        </p>
        <Button color="neutral" render={<Link href="/platform/sell" />}>
          {copy.action.primary}
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </>
  );
};

export const GoogleAiModeGeminiBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { googleChannelPage: copy } = await getMessages();

  return (
    <>
      {sections.map((section, index) => (
        <Fragment key={section.id}>
          {index > 0 && <SectionGutter />}
          {(() => {
            switch (section.id) {
              case "shops":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <SectionHeading section={section} />
                    <ShoppingExplorer copy={copy.explorer} />
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "reads":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <SectionHeading section={section} />
                    <ProductData copy={copy.reading} />
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
