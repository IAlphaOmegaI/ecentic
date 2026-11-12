import {
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import type { ReactNode } from "react";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import type { MarketingPage } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingFeatureBand,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";

const pageIcons = {
  connect: [
    CommercePlug_3SparkleIcon,
    CommerceFileShieldIcon,
    CommerceBasketShoppingIcon,
  ],
  simulate: [
    CommerceChartActivity_2Icon,
    CommerceCode_3Icon,
    CommerceFileShieldIcon,
  ],
  fix: [CommerceFilePenIcon, CommerceFileShieldIcon, CommercePlug_3SparkleIcon],
  sell: [
    CommerceBasketShoppingIcon,
    CommerceFileShieldIcon,
    CommerceCode_3Icon,
  ],
  track: [
    CommerceChartActivity_2Icon,
    CommerceCode_3Icon,
    CommercePlug_3SparkleIcon,
  ],
} as const;

const figures = {
  connect: "headphones",
  simulate: "catalog",
  fix: "format",
  sell: "checkout",
  track: "relay",
} as const;

/** The figures illustrate a relationship; they never encode invented metrics. */
const PlatformDiagram = ({ kind }: { kind: PlatformPrinciples.Kind }) => (
  <div className="relative min-w-0" data-platform-diagram={kind}>
    <CommerceFigure
      kind={figures[kind]}
      surface="dark"
      className="mx-auto aspect-[5/3] max-w-xl"
    />
  </div>
);

/** One concentrated dark explanation per platform page; everyday reading stays on the canvas. */
export const PlatformPrinciples = ({
  section,
  kind,
  children,
}: PlatformPrinciples.Props) => (
  <MarketingFeatureBand id={section.id} data-platform-principles={kind}>
    <MarketingHeading
      eyebrow={section.eyebrow}
      title={section.title}
      description={section.description}
      className="pb-10 [&>.marketing-eyebrow]:text-primary-rich [&>p]:text-background-rich/75"
    />
    <div className="marketing-seam relative grid gap-px border border-[var(--rail-color)] border-x-transparent border-y bg-[var(--rail-color)] bg-clip-padding md:grid-cols-2">
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35" />
      {section.items?.map((item, index) => {
        const Icon = pageIcons[kind][index % 3] ?? CommerceCode_3Icon;
        return (
          <article
            key={item.title}
            className={cn(
              "relative min-w-0 bg-emphasis-dimmed",
              index === 0 && "flex flex-col md:row-span-2",
            )}
          >
            {index > 0 && (
              <Plus className="top-0 left-0 z-1 -translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35" />
            )}
            <div className="px-8 py-8 max-sm:px-5">
              <Icon aria-hidden className="mb-6 size-8 text-primary-rich" />
              <h3 className="text-background-rich">{item.title}</h3>
              <p className="mt-4 max-w-[50ch] text-background-rich/75">
                {item.body}
              </p>
            </div>
            {index === 0 && (
              <div className="mt-auto">
                <PlatformDiagram kind={kind} />
              </div>
            )}
          </article>
        );
      })}
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2 [&>span]:bg-background-rich/35" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 [&>span]:bg-background-rich/35" />
    </div>
    {children}
    {(section.paragraphs?.length || section.note || section.links?.length) && (
      <div className="px-8 py-8 max-sm:px-5">
        {section.paragraphs?.map((paragraph) => (
          <p key={paragraph} className="mt-4 text-background-rich/75">
            {paragraph}
          </p>
        ))}
        {section.note && (
          <p className="mt-4 text-background-rich/75">{section.note}</p>
        )}
        <MarketingActions actions={section.links ?? []} />
      </div>
    )}
  </MarketingFeatureBand>
);

export namespace PlatformPrinciples {
  export type Kind = keyof typeof pageIcons;
  export type Props = {
    section: MarketingPage.Section;
    kind: Kind;
    children?: ReactNode;
  };
}
