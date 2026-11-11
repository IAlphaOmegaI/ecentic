import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import type { ReactNode } from "react";
import type { MarketingPage } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingFeatureBand,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { PlatformProviderStack } from "../provider-stack";
import { PlatformLight } from "./platform-light";

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

/** A structural product diagram, without fabricated metric values. */
const PlatformDiagram = ({ kind }: { kind: PlatformPrinciples.Kind }) => {
  const Icon = pageIcons[kind][0];
  return (
    <div
      aria-hidden
      className="relative isolate flex h-72 items-center justify-center overflow-hidden px-8 max-sm:px-4"
      data-platform-diagram={kind}
    >
      <div className="absolute inset-0 -z-1 bg-radial-[at_60%_50%] from-primary/20 via-primary/4 to-transparent" />
      <div className="absolute inset-x-12 top-1/2 border-primary-rich/30 border-t" />
      <PlatformLight />
      <div className="relative flex w-full max-w-md items-center gap-6 max-sm:gap-3">
        <div className="flex w-1/3 shrink-0 flex-col items-center gap-5">
          {kind === "connect" ? (
            <div className="flex flex-col items-center gap-5">
              <PlatformProviderStack
                providers={["shopify", "woocommerce"]}
                className="-space-x-2 [&>span]:size-14 max-sm:[&>span]:size-12 max-sm:[&>span]:p-2.5"
              />
              <CommerceCode_3Icon className="size-8 text-primary-rich" />
            </div>
          ) : kind === "simulate" ? (
            <PlatformProviderStack
              providers={["chatgpt", "claude", "gemini"]}
              className="flex-col space-x-0 -space-y-4 [&>span]:size-14"
            />
          ) : (
            <div className="relative grid size-24 place-items-center rounded-xl border border-background-rich/15 bg-linear-to-br from-emphasis-rich to-emphasis-dimmed shadow-[0_12px_36px_-20px_var(--color-primary)]">
              <Icon className="size-12 text-primary-rich" />
            </div>
          )}
        </div>
        <ArrowRightIcon className="relative size-6 shrink-0 text-primary-rich" />
        <div className="relative min-w-0 flex-1 rounded-lg border border-primary-rich/40 bg-linear-to-br from-primary-dimmed to-emphasis-dimmed p-5 shadow-[0_0_64px_-24px_var(--color-primary)] max-sm:p-3">
          <div className="flex items-center gap-2 border-background-rich/15 border-b pb-4">
            <span className="size-2 rounded-full bg-primary-rich" />
            <span className="h-px flex-1 bg-background-rich/25" />
          </div>
          <div className="mt-5 grid gap-4 font-mono text-sm">
            {(kind === "sell"
              ? ["product", "cart", "checkout"]
              : kind === "track"
                ? ["referral", "order", "source"]
                : kind === "simulate"
                  ? ["product", "competitor", "question"]
                  : kind === "fix"
                    ? ["title", "description", "published"]
                    : ["title", "description", "source"]
            ).map((field, index) => (
              <div
                key={field}
                className="flex min-w-0 flex-wrap items-center gap-2"
              >
                <span
                  className={
                    index === 1 ? "text-info-foreground" : "text-primary-rich"
                  }
                >
                  {field}
                </span>
                <span className="h-px w-6 bg-background-rich/25" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

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
    <div className="relative grid gap-px border border-[var(--rail-color)] border-x-transparent bg-[var(--rail-color)] bg-clip-padding md:grid-cols-2">
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35" />
      {section.items?.map((item, index) => {
        const Icon = pageIcons[kind][index % 3] ?? CommerceCode_3Icon;
        return (
          <article
            key={item.title}
            className={cn(
              "relative min-w-0 bg-emphasis-dimmed",
              index === 0 &&
                "flex flex-col bg-linear-to-br from-primary-dimmed/65 via-emphasis-dimmed to-emphasis-dimmed md:row-span-2",
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
