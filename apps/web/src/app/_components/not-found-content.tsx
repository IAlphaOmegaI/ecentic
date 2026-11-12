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
import { MarketingBand } from "@/components/marketing/primitives";
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
    round14NotFound,
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
            <h1 className="text-[clamp(2.5rem,4.5vw,4rem)]">
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
      <MarketingBand>
        <div id="explore" className="scroll-mt-6 px-8 py-8 max-sm:px-4">
          <h2 className="text-[clamp(1.5rem,3vw,2.25rem)]">
            {reviewNotFound.exploreTitle}
          </h2>
        </div>
        <nav
          aria-label={content.navigation}
          data-columns="3"
          className="marketing-grid marketing-section-grid grid grid-cols-3 border-accent-foreground border-t max-sm:grid-cols-1 max-[801px]:grid-cols-2"
        >
          {content.links.map((link, index) => {
            const Icon = navigationIcons[index] ?? CommerceBasketShoppingIcon;
            return (
              <a
                key={link.href}
                href={localizePath(link.href, locale)}
                className="group flex min-h-28 items-center gap-4 border-accent-foreground border-r border-b px-8 py-8 text-foreground-rich text-xl hover:bg-background-dimmed hover:text-primary-text max-sm:min-h-24 max-sm:px-4 max-sm:py-6"
              >
                <Icon
                  aria-hidden
                  className="size-8 shrink-0 text-primary-text"
                />
                <span>{link.label}</span>
                <ArrowRightIcon
                  aria-hidden
                  className="ml-auto size-4 shrink-0 text-primary-text"
                />
              </a>
            );
          })}
        </nav>
      </MarketingBand>
      <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden">
        <div className="grid grid-cols-[1fr_2fr] gap-10 px-8 py-10 max-sm:px-4 max-md:grid-cols-1 max-md:gap-6">
          <div>
            <h2 className="text-2xl">{round14NotFound.machineTitle}</h2>
            <p className="mt-4 max-w-[34ch] text-foreground-dimmed text-sm leading-relaxed">
              {content.machineDescription}
            </p>
          </div>
          <nav aria-label={content.machineNavigation}>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-2 max-sm:grid-cols-1">
              {RECOVERY_LINKS.map((link, index) => {
                const copy = content.recoveryLinks[index];
                if (!copy) return null;
                const Icon = recoveryIcons[index] ?? FileIcon;
                const href =
                  link.href === "/" || link.href === "/docs"
                    ? localizePath(link.href, locale)
                    : link.href;
                return (
                  <li key={link.href}>
                    <a
                      className="marketing-text-link flex min-h-14 items-center gap-4 text-primary-text text-sm hover:underline"
                      href={href}
                    >
                      <Icon aria-hidden className="size-6 shrink-0" />
                      {copy.label}
                    </a>
                  </li>
                );
              })}
              <li>
                <a
                  className="marketing-text-link flex min-h-14 items-center gap-4 text-primary-text text-sm hover:underline"
                  href="/404.md"
                >
                  <FileIcon aria-hidden className="size-6 shrink-0" />
                  {content.markdownAction}
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </MarketingBand>
    </main>
  );
};

export namespace NotFoundContent {
  export type Props = { locale: Locale };
}
