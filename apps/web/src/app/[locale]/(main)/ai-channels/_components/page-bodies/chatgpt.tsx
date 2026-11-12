import {
  CheckIcon,
  CommerceFileShieldIcon,
  CommerceGlobePointerIcon,
} from "@zenncore/icons";
import { getMessages } from "next-intl/server";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { ConnectedJourney } from "@/components/marketing/connected-journey";
import { MarketingSection } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { ChannelWorkbench } from "../channel-content";

type Section = MarketingBodyProps["sections"][number];
type Copy = Awaited<ReturnType<typeof getMessages>>["chatgptPage"];

const SectionHeading = ({ section }: { section: Section }) => (
  <div className="px-7 pt-12 pb-8 max-sm:px-4 max-sm:pt-8">
    <h2>{section.title}</h2>
    {section.description && (
      <p className="mt-4 max-w-[70ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
        {section.description}
      </p>
    )}
  </div>
);

const ShoppingPath = ({ copy }: { copy: Copy["shopping"] }) => (
  <div className="relative grid border-accent-foreground border-t bg-linear-to-br from-primary/8 via-background-rich to-background lg:grid-cols-[1fr_1fr_1.25fr]">
    <div className="relative flex min-w-0 flex-col border-accent-foreground px-4 py-8 max-lg:border-b sm:px-8 lg:border-r">
      <p className="font-medium text-foreground-rich">{copy.feed}</p>
      <CommerceFigure
        kind="documentStack"
        className="mx-auto aspect-[5/3] w-full"
      />
    </div>
    <div className="relative flex min-h-64 flex-col items-center justify-center border-accent-foreground px-4 py-8 max-lg:border-b sm:px-8 lg:border-r">
      <ProviderLogo
        provider="chatgpt"
        decorative
        className="size-16 rounded-none object-center"
      />
      <p className="mt-6 font-heading text-3xl text-foreground-rich">ChatGPT</p>
      <p className="mt-3 max-w-[24ch] text-center text-foreground-dimmed text-sm">
        {copy.discovery}
      </p>
    </div>
    <div className="grid grid-rows-2">
      <div className="flex items-start gap-4 border-accent-foreground border-b px-4 py-8 sm:px-8">
        <CommerceGlobePointerIcon
          aria-hidden
          className="mt-1 size-6 shrink-0 text-primary-text"
        />
        <div>
          <p className="text-foreground-dimmed text-sm">{copy.link}</p>
          <p className="mt-3 font-medium text-foreground-rich">{copy.store}</p>
        </div>
      </div>
      <div className="flex items-start gap-4 px-4 py-8 sm:px-8">
        <CommerceFileShieldIcon
          aria-hidden
          className="mt-1 size-6 shrink-0 text-primary-text"
        />
        <div>
          <p className="text-foreground-dimmed text-sm">{copy.approval}</p>
          <p className="mt-3 font-medium text-foreground-rich">
            {copy.checkout}
          </p>
        </div>
      </div>
    </div>
  </div>
);

const ReadingExplorer = ({
  section,
  copy,
}: {
  section: Section;
  copy: Copy["reading"];
}) => {
  const paragraphs = section.description?.split(/(?<=[.!?])\s+/u) ?? [];
  return (
    <>
      <div className="px-8 pt-12 pb-8 max-sm:px-4 max-sm:pt-8">
        <h2>{section.title}</h2>
      </div>
      <ConnectedJourney
        label={copy.label}
        items={copy.records.map((record, index) => ({
          id: record.id,
          title: record.title,
          icon:
            record.id === "product"
              ? "catalog"
              : record.id === "seller"
                ? "access"
                : "checkout",
          content: (
            <div className="grid min-w-0 gap-8 lg:grid-cols-[1.2fr_1fr]">
              <div className="relative min-w-0">
                <CommerceFigure
                  kind={
                    record.id === "product"
                      ? "documentStack"
                      : record.id === "seller"
                        ? "document"
                        : "moneyStack"
                  }
                  className="mx-auto aspect-[5/3] w-full max-w-lg"
                />
                <ul className="grid grid-cols-1 border-accent-foreground border-y sm:grid-cols-2">
                  {record.fields.map((field) => (
                    <li
                      key={field}
                      className="flex items-center gap-3 px-2 py-4 text-foreground-rich text-sm"
                    >
                      <CheckIcon
                        aria-hidden
                        className="size-4 shrink-0 text-primary-text"
                      />
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex min-w-0 flex-col justify-center gap-8">
                <div>
                  <h3>{record.title}</h3>
                  <p className="mt-4 max-w-[44ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                    {paragraphs[index]}
                  </p>
                </div>
                <p className="max-w-[44ch] text-foreground-dimmed text-sm">
                  {copy.caption}
                </p>
              </div>
            </div>
          ),
        }))}
      />
    </>
  );
};

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
      <div className="px-7 pt-12 pb-8 max-sm:px-4 max-sm:pt-8">
        <h2>{section.title}</h2>
      </div>
      <ConnectedJourney
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
    </>
  );
};

export const ChatgptBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { chatgptPage: copy } = await getMessages();

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
                    <SectionHeading section={section} />
                    <ShoppingPath copy={copy.shopping} />
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "reads":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <ReadingExplorer section={section} copy={copy.reading} />
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
