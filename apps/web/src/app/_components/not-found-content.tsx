import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceBookOpenIcon,
  CommerceCode_3Icon,
  CommercePlug_3SparkleIcon,
  CreditCardIcon,
  EnvelopeIcon,
  FileIcon,
  FileSearchIcon,
  GlobeSearchIcon,
  HomeIcon,
  RobotIcon,
} from "@zenncore/icons";
import type { Metadata } from "next";
import Image from "next/image";
import { getMessages } from "next-intl/server";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";
import {
  MarketingBand,
  MarketingFeatureBand,
} from "@/components/marketing/primitives";
import { localizePath } from "@/i18n/locale";
import type { Locale } from "@/i18n/routing";
import { RECOVERY_LINKS } from "@/lib/not-found";
import { seo } from "@/lib/seo";
import { NotFoundActions } from "./not-found-actions";
import { NotFoundArtwork } from "./not-found-artwork";
import { QueryFigure } from "./query-figure";

export const recoveryMetadata = async (locale: Locale): Promise<Metadata> => {
  const { enterpriseRecovery } = await getMessages({ locale });
  return {
    metadataBase: new URL(seo.host),
    title: { absolute: enterpriseRecovery.notFound.meta.title },
    description: enterpriseRecovery.notFound.meta.description,
    robots: { index: false, follow: true },
    alternates: { types: { "text/markdown": "/404.md" } },
  };
};

const navigationIcons = [
  CommerceBasketShoppingIcon,
  CommercePlug_3SparkleIcon,
  RobotIcon,
  CreditCardIcon,
  CommerceBookOpenIcon,
  EnvelopeIcon,
];
const recoveryIcons = [
  HomeIcon,
  CommerceBookOpenIcon,
  GlobeSearchIcon,
  RobotIcon,
  FileSearchIcon,
  CommerceCode_3Icon,
];

export const NotFoundContent = async ({ locale }: NotFoundContent.Props) => {
  const {
    enterpriseRecovery,
    reviewNotFound,
    round18Recovery,
    hairlineRecovery,
  } = await getMessages({ locale });
  const content = enterpriseRecovery.notFound;
  return (
    <main id="main-content">
      <MarketingBand
        data-not-found-hero
        className="min-h-dvh [&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:flex [&>.marketing-rail]:min-h-[calc(100dvh-2px)] [&>.marketing-rail]:flex-col"
      >
        <header className="flex min-h-20 items-center justify-between gap-4 px-8 py-4 max-sm:min-h-18 max-sm:px-4">
          <a
            href={localizePath("/", locale)}
            aria-label={content.home}
            className="inline-flex min-h-11 items-center"
          >
            <Image
              src="/images/wordmark.svg"
              alt="ecentic"
              width={112}
              height={28}
              priority
            />
          </a>
          <p className="text-foreground-dimmed text-sm">
            {reviewNotFound.status}
          </p>
        </header>
        <div className="relative flex flex-1 flex-col items-center justify-center">
          <NotFoundArtwork />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_260px] items-end gap-x-10 gap-y-6 px-8 pt-4 pb-10 max-sm:grid-cols-[minmax(0,1fr)_148px] max-sm:gap-x-4 max-sm:gap-y-4 max-sm:px-4 max-sm:pb-6 max-[360px]:grid-cols-[minmax(0,1fr)_96px] max-[360px]:gap-x-2">
          <div className="col-start-1 max-sm:col-span-2">
            <h1 className="text-4xl lg:text-5xl xl:text-6xl">
              <span className="sr-only">404. </span>
              {content.title}
            </h1>
            <p className="mt-4 max-w-[58ch] text-lg leading-relaxed max-sm:text-base">
              {reviewNotFound.description}
            </p>
          </div>
          <div className="col-start-1">
            <NotFoundActions
              homeHref={localizePath("/", locale)}
              homeLabel={reviewNotFound.action.primary}
              backLabel={reviewNotFound.action.secondary}
              exploreLabel={reviewNotFound.action.tertiary}
            />
          </div>
          <div className="col-start-2 row-span-2 row-start-1 self-center max-sm:row-span-1 max-sm:row-start-2">
            <QueryFigure label={hairlineRecovery.label} />
          </div>
        </div>
      </MarketingBand>
      <MarketingFeatureBand
        id="explore"
        tone="blue"
        aria-labelledby="recovery-navigation-title"
        className="scroll-mt-6"
      >
        <header className="relative border-background-rich/25 border-y px-8 py-10 max-sm:px-4 max-sm:py-8">
          <MarketingEdgeCrosses />
          <MarketingEdgeCrosses edge="bottom" />
          <h2 id="recovery-navigation-title">{reviewNotFound.exploreTitle}</h2>
        </header>
        <nav aria-label={content.navigation} className="relative">
          <MarketingEdgeCrosses edge="bottom" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3">
            {content.links.map((link, index) => {
              const Icon = navigationIcons[index] ?? CommerceBasketShoppingIcon;
              return (
                <a
                  key={link.href}
                  href={localizePath(link.href, locale)}
                  className="group flex min-h-32 min-w-0 items-center gap-5 border-background-rich/25 border-b px-8 py-8 text-background-rich text-xl transition-colors hover:bg-background-rich/10 focus-visible:bg-background-rich/10 focus-visible:outline-background-rich! focus-visible:-outline-offset-4! motion-reduce:transition-none max-sm:min-h-24 max-sm:px-4 max-sm:py-6 sm:odd:border-r lg:border-r lg:[&:nth-child(3n)]:border-r-0"
                >
                  <Icon aria-hidden className="size-8 shrink-0" />
                  <span>{link.label}</span>
                  <ArrowRightIcon
                    aria-hidden
                    className="ml-auto size-4 shrink-0 opacity-70"
                  />
                </a>
              );
            })}
          </div>
        </nav>
      </MarketingFeatureBand>
      <MarketingFeatureBand
        id="agent-recovery"
        tone="dark"
        aria-labelledby="agent-recovery-title"
        className="mt-6"
      >
        <header className="relative grid items-end gap-6 border-background-rich/20 border-y px-8 py-10 max-sm:px-4 max-sm:py-8 md:grid-cols-[1fr_1fr]">
          <MarketingEdgeCrosses />
          <MarketingEdgeCrosses edge="bottom" />
          <div>
            <RobotIcon aria-hidden className="mb-6 size-8 text-primary-rich" />
            <h2 id="agent-recovery-title">{round18Recovery.title}</h2>
          </div>
          <p className="max-w-[48ch] text-background-rich/75 leading-relaxed">
            {round18Recovery.description}
          </p>
        </header>
        <nav aria-label={content.machineNavigation}>
          <div className="flex items-center gap-3 border-background-rich/20 border-b px-8 py-5 text-background-rich/70 text-sm max-sm:px-4">
            <CommerceCode_3Icon
              aria-hidden
              className="size-4 shrink-0 text-primary-rich"
            />
            <p>{round18Recovery.indexTitle}</p>
          </div>
          <ul>
            {RECOVERY_LINKS.map((link, index) => {
              const copy = content.recoveryLinks[index];
              if (!copy) return null;
              const Icon = recoveryIcons[index] ?? FileIcon;
              const href =
                link.href === "/" || link.href === "/docs"
                  ? localizePath(link.href, locale)
                  : link.href;
              return (
                <li
                  key={link.href}
                  className="border-background-rich/15 border-b"
                >
                  <a
                    className="group grid min-h-18 grid-cols-[24px_minmax(0,1fr)_16px] items-center gap-x-5 gap-y-1 px-8 py-5 text-background-rich transition-colors hover:bg-background-rich/5 focus-visible:bg-background-rich/5 focus-visible:outline-primary-rich! focus-visible:-outline-offset-4! motion-reduce:transition-none max-sm:gap-x-3 max-sm:px-4 md:grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_16px]"
                    href={href}
                  >
                    <Icon
                      aria-hidden
                      className="col-start-1 row-start-1 size-4 shrink-0 text-primary-rich"
                    />
                    <code className="wrap-anywhere col-start-2 row-start-1 min-w-0 font-mono text-primary-rich text-sm">
                      {href}
                    </code>
                    <span className="col-start-2 row-start-2 text-background-rich/75 text-sm md:col-start-3 md:row-start-1">
                      {copy.label}
                    </span>
                    <ArrowRightIcon
                      aria-hidden
                      className="col-start-3 row-start-1 size-4 opacity-60 md:col-start-4"
                    />
                  </a>
                </li>
              );
            })}
            <li className="relative border-background-rich/20 border-b">
              <MarketingEdgeCrosses edge="bottom" />
              <a
                className="group grid min-h-18 grid-cols-[24px_minmax(0,1fr)_16px] items-center gap-x-5 gap-y-1 px-8 py-5 text-background-rich transition-colors hover:bg-background-rich/5 focus-visible:bg-background-rich/5 focus-visible:outline-primary-rich! focus-visible:-outline-offset-4! motion-reduce:transition-none max-sm:gap-x-3 max-sm:px-4 md:grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_16px]"
                href="/404.md"
              >
                <FileIcon
                  aria-hidden
                  className="col-start-1 row-start-1 size-4 text-primary-rich"
                />
                <code className="col-start-2 row-start-1 font-mono text-primary-rich text-sm">
                  /404.md
                </code>
                <span className="col-start-2 row-start-2 text-background-rich/75 text-sm md:col-start-3 md:row-start-1">
                  {content.markdownAction}
                </span>
                <ArrowRightIcon
                  aria-hidden
                  className="col-start-3 row-start-1 size-4 opacity-60 md:col-start-4"
                />
              </a>
            </li>
          </ul>
        </nav>
      </MarketingFeatureBand>
    </main>
  );
};

export namespace NotFoundContent {
  export type Props = { locale: Locale };
}
