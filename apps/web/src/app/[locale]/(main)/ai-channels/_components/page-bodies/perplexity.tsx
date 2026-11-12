import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommerceGlobePointerIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { getMessages } from "next-intl/server";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { ConnectedJourney } from "@/components/marketing/connected-journey";
import { IllustrationGlow } from "@/components/marketing/illustration-glow";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
  MarketingFeatureBand,
} from "@/components/marketing/primitives";
import { ChannelWorkbench } from "../channel-content";

type Section = MarketingBodyProps["sections"][number];
type Copy = Awaited<ReturnType<typeof getMessages>>["perplexityPage"];

const SectionHeading = ({
  section,
  dark = false,
}: {
  section: Section;
  dark?: boolean;
}) => (
  <div className="px-7 pt-12 pb-8 max-sm:px-4 max-sm:pt-8">
    <h2>{section.title}</h2>
    {section.description && (
      <p
        className={
          dark
            ? "mt-4 max-w-[70ch] text-background-rich/70 text-lg leading-relaxed max-sm:text-base"
            : "mt-4 max-w-[70ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base"
        }
      >
        {section.description}
      </p>
    )}
  </div>
);

type ReviewCopy = Awaited<
  ReturnType<typeof getMessages>
>["reviewSolutionsChannels"]["perplexity"];

const ProductCard = ({ copy }: { copy: ReviewCopy }) => (
  <div
    data-perplexity-product-card
    className="overflow-hidden rounded-lg border border-accent-foreground bg-background-rich text-foreground-rich shadow-emphasis/5 shadow-md"
  >
    <div className="flex h-36 items-center justify-center bg-background p-4 sm:h-44">
      <Image
        src="/images/products/sony-wh-1000xm5.webp"
        alt=""
        width={200}
        height={180}
        className="h-full w-full object-contain mix-blend-multiply"
      />
    </div>
    <div className="space-y-2 p-4">
      <p className="font-medium text-base">{copy.product}</p>
      <p className="text-foreground-dimmed text-xs">{copy.details}</p>
      <p className="pt-2 text-foreground text-xs">{copy.price}</p>
      <div className="flex items-center justify-between gap-4 border-accent-foreground border-t pt-3 text-primary-text text-xs">
        <span>{copy.website}</span>
        <ArrowRightIcon aria-hidden className="size-4 shrink-0" />
      </div>
    </div>
  </div>
);

const ShoppingExplorer = ({ copy }: { copy: ReviewCopy }) => (
  <div className="border-background-rich/15 border-t">
    <div
      data-perplexity-shopping-grid
      className="grid min-w-0 md:grid-cols-[1fr_1.2fr]"
    >
      <div
        data-perplexity-conversation
        className="relative isolate flex min-w-0 flex-col border-background-rich/15 bg-emphasis max-md:border-b md:border-r"
      >
        <IllustrationGlow />
        <header className="flex items-center justify-between gap-4 border-background-rich/15 border-b px-7 py-6 max-sm:px-4">
          <Image
            src="/images/perplexity.svg"
            alt="Perplexity"
            width={24}
            height={24}
            className="size-6"
          />
          <span className="text-background-rich/55 text-xs">{copy.sample}</span>
        </header>
        <div className="min-w-0 px-7 py-6 max-sm:px-4">
          <p className="ml-auto w-fit max-w-[88%] rounded-lg rounded-tr-sm border border-background-rich/10 bg-emphasis-rich px-4 py-3 text-background-rich text-sm leading-relaxed">
            {copy.question}
          </p>
          <p className="my-6 text-background-rich/75 text-sm leading-relaxed">
            {copy.answer}
          </p>
          <ProductCard copy={copy} />
        </div>
        <p className="mt-auto border-background-rich/15 border-t px-7 py-5 text-background-rich/50 text-xs leading-relaxed max-sm:px-4">
          {copy.sampleNote}
        </p>
      </div>
      <div className="min-w-0 px-7 py-8 max-sm:px-4">
        <h3 className="text-2xl!">{copy.pathsTitle}</h3>
        <p className="mt-3 max-w-[50ch] text-background-rich/65 text-sm leading-relaxed">
          {copy.pathsDescription}
        </p>
        <ol className="relative mt-8 grid gap-6 border-primary-rich/25 border-l pl-6">
          {[
            {
              title: copy.storeTitle,
              body: copy.storeBody,
              label: copy.storeBadge,
              Icon: CommerceGlobePointerIcon,
            },
            {
              title: copy.purchaseTitle,
              body: copy.purchaseBody,
              label: copy.purchaseBadge,
              Icon: CommerceBasketShoppingIcon,
            },
          ].map(({ title, body, label, Icon }) => (
            <li
              key={title}
              className="relative rounded-lg border border-background-rich/15 bg-emphasis p-5"
            >
              <span
                aria-hidden
                className="absolute top-8 -left-6 h-px w-6 bg-primary-rich/25"
              />
              <div className="mb-4 flex items-center justify-between gap-4">
                <Icon aria-hidden className="size-8 text-primary-rich" />
                <span className="text-background-rich/50 text-xs">{label}</span>
              </div>
              <h4 className="text-xl!">{title}</h4>
              <p className="mt-3 text-background-rich/70 text-sm leading-relaxed">
                {body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
    <div className="marketing-seam flex flex-wrap items-start justify-between gap-6 border-background-rich/15 border-t px-7 py-7 max-sm:px-4">
      <div className="max-w-[65ch]">
        <h3 className="text-xl!">{copy.trackingTitle}</h3>
        <p className="mt-3 text-background-rich/70 text-sm leading-relaxed">
          {copy.trackingBody}
        </p>
      </div>
      <Button
        color="neutral"
        render={<a href="https://www.perplexity.ai/hub/blog/shop-like-a-pro" />}
      >
        {copy.source}
        <ArrowRightIcon aria-hidden className="size-4" />
      </Button>
    </div>
  </div>
);

const ProductInformation = ({ copy }: { copy: ReviewCopy }) => (
  <div className="border-accent-foreground border-t">
    <div className="grid min-w-0 items-center md:grid-cols-[1fr_80px_1fr]">
      <div className="px-7 py-8 max-sm:px-4">
        <p className="mb-5 text-foreground-dimmed text-sm">{copy.record}</p>
        <div className="rounded-xl border border-accent-foreground bg-background-rich p-5">
          <div className="flex items-center gap-4 border-accent-foreground border-b pb-5">
            <Image
              src="/images/products/sony-wh-1000xm5.webp"
              alt=""
              width={64}
              height={64}
              className="size-16 rounded-md bg-background object-contain p-2"
            />
            <p className="font-heading text-foreground-rich text-xl">
              {copy.product}
            </p>
          </div>
          <dl className="divide-y divide-accent-foreground">
            {copy.attributes.map((attribute, index) => {
              const Icon =
                [
                  CommerceFilePenIcon,
                  CommerceBasketShoppingIcon,
                  CommerceGlobePointerIcon,
                ][index] ?? CommerceFileShieldIcon;
              return (
                <div
                  key={attribute.title}
                  className="relative py-5 pl-14 last:pb-0"
                >
                  <dt className="font-medium text-foreground-rich">
                    <span
                      aria-hidden
                      className="absolute top-5 left-0 grid size-10 place-items-center rounded-md border border-primary/15 bg-primary/5 text-primary"
                    >
                      <Icon className="size-6" />
                    </span>
                    {attribute.title}
                  </dt>
                  <dd className="mt-1 text-foreground-dimmed text-sm leading-relaxed">
                    {attribute.value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
      <div
        aria-hidden
        className="relative flex h-16 items-center justify-center text-primary md:h-full"
      >
        <span className="absolute inset-x-0 top-1/2 h-px bg-primary/25 max-md:hidden" />
        <span className="absolute inset-y-0 left-1/2 w-px bg-primary/25 md:hidden" />
        <ArrowRightIcon className="relative size-8 bg-background p-1 max-md:rotate-90" />
      </div>
      <div className="relative isolate px-7 py-8 max-sm:px-4">
        <IllustrationGlow />
        <div className="mx-auto max-w-72">
          <div className="mb-5 flex items-center gap-3 text-foreground-rich text-sm">
            <Image
              src="/images/perplexity.svg"
              alt="Perplexity"
              width={24}
              height={24}
              className="size-6"
            />
            <span>{copy.productCard}</span>
          </div>
          <ProductCard copy={copy} />
        </div>
      </div>
    </div>
    <p className="marketing-seam border-accent-foreground border-t px-7 py-6 text-foreground-dimmed text-sm leading-relaxed max-sm:px-4">
      {copy.merchantNote}
    </p>
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
    <div className="grid min-w-0 lg:grid-cols-[1fr_1.6fr]">
      <div className="border-accent-foreground px-7 py-12 max-sm:px-4 max-sm:py-8 max-lg:border-b lg:border-r">
        <h2>{section.title}</h2>
        {section.links && <MarketingActions actions={section.links} />}
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
    </div>
  );
};

export const PerplexityBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { perplexityPage: copy, reviewSolutionsChannels: review } =
    await getMessages();

  return (
    <>
      {sections.map((section, index) => (
        <Fragment key={section.id}>
          {index > 0 && <SectionGutter />}
          {(() => {
            switch (section.id) {
              case "shops":
                return (
                  <MarketingFeatureBand id={section.id} tone="dark">
                    <SectionHeading section={section} dark />
                    <ShoppingExplorer copy={review.perplexity} />
                    {sectionChildren?.[section.id]}
                  </MarketingFeatureBand>
                );
              case "reads":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <SectionHeading section={section} />
                    <ProductInformation copy={review.perplexity} />
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
