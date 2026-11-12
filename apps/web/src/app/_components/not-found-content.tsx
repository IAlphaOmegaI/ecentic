import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import Image from "next/image";
import { getMessages } from "next-intl/server";
import { MarketingBand } from "@/components/marketing/primitives";
import { localizePath } from "@/i18n/locale";
import type { Locale } from "@/i18n/routing";
import { RECOVERY_LINKS } from "@/lib/not-found";
import { seo } from "@/lib/seo";
import { NotFoundActions } from "./not-found-actions";

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

const NotFoundAscii = () => (
  <div
    aria-hidden="true"
    data-not-found-ascii
    className="relative isolate flex h-full min-h-[480px] min-w-0 flex-col justify-between overflow-hidden bg-emphasis-dimmed px-7 py-8 text-background-rich [clip-path:polygon(20px_0,100%_0,100%_calc(100%_-_20px),calc(100%_-_20px)_100%,0_100%,0_20px)] max-sm:px-4 max-sm:py-5 max-md:min-h-[290px]"
  >
    <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_70%_110%,color-mix(in_oklab,var(--color-primary)_34%,transparent),transparent_65%)]" />
    <div className="flex items-center justify-between border-background-rich/20 border-b pb-4 font-mono text-background-rich/65 text-xs">
      <span>HTTP / 404</span>
      <span>ecentic.ai</span>
    </div>
    <div className="relative my-8 w-full [container-type:inline-size] max-md:my-5">
      <pre className="m-0 select-none whitespace-pre bg-linear-to-b from-background-rich via-background-rich/85 to-primary bg-clip-text p-0 text-center font-medium font-mono text-[min(5cqw,29px)] text-transparent leading-[1.15] tracking-normal [font-variant-ligatures:none]">
        {[
          "    44       000000       44    ",
          "   444      00    00     444    ",
          "  4444      00    00    4444    ",
          " 44 44      00    00   44 44    ",
          "44  44      00    00  44  44    ",
          "444444444   00    00  444444444 ",
          "    44      00    00      44    ",
          "    44      00    00      44    ",
          "    44       000000       44    ",
        ].join("\n")}
      </pre>
    </div>
    <div className="flex items-center justify-between border-background-rich/20 border-t pt-4 font-mono text-background-rich/65 text-xs">
      <span>./</span>
      <span>+ — — — +</span>
      <span>∅</span>
    </div>
  </div>
);

export const NotFoundContent = async ({ locale }: NotFoundContent.Props) => {
  const { enterpriseRecovery, reviewNotFound } = await getMessages({ locale });
  const content = enterpriseRecovery.notFound;
  return (
    <main id="main-content">
      <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden">
        <header className="flex min-h-20 items-center justify-between gap-4 px-7 py-5 max-sm:min-h-18 max-sm:px-4">
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
      </MarketingBand>
      <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden">
        <div className="grid grid-cols-2 max-md:grid-cols-1">
          <div className="flex min-w-0 flex-col items-start justify-center px-7 py-14 max-sm:px-4 max-sm:py-9">
            <h1 className="max-w-[9ch] text-[clamp(2.75rem,5.4vw,4.75rem)]">
              <span className="sr-only">404. </span>
              {content.title}
            </h1>
            <p className="mt-6 max-w-[39ch] text-lg leading-relaxed max-sm:mt-4 max-sm:text-base">
              {reviewNotFound.description}
            </p>
            <NotFoundActions
              homeHref={localizePath("/", locale)}
              homeLabel={reviewNotFound.action.primary}
              backLabel={reviewNotFound.action.secondary}
            />
            <Button
              variant="ghost"
              color="primary"
              render={<a href="#explore" />}
              className="mt-5 min-h-11 px-0 text-primary-text hover:bg-transparent hover:underline focus-visible:outline-solid"
            >
              {reviewNotFound.action.tertiary}
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
          <div className="min-w-0 border-accent-foreground border-l p-5 max-md:order-first max-md:border-l-0 max-md:p-4">
            <NotFoundAscii />
          </div>
        </div>
      </MarketingBand>
      <MarketingBand>
        <div id="explore" className="scroll-mt-6 px-7 py-8 max-sm:px-4">
          <h2 className="text-[clamp(1.5rem,3vw,2.25rem)]">
            {reviewNotFound.exploreTitle}
          </h2>
        </div>
        <nav
          aria-label={content.navigation}
          data-columns="3"
          className="marketing-grid marketing-section-grid grid grid-cols-3 border-accent-foreground border-t max-sm:grid-cols-1 max-[801px]:grid-cols-2"
        >
          {content.links.map((link) => (
            <a
              key={link.href}
              href={localizePath(link.href, locale)}
              className="group flex min-h-22 items-center justify-between gap-4 border-accent-foreground border-r border-b px-7 py-6 text-foreground-rich text-xl hover:bg-background-dimmed hover:text-primary-text max-sm:min-h-18 max-sm:px-4"
            >
              {link.label}
              <ArrowRightIcon className="size-5 shrink-0 text-primary-text" />
            </a>
          ))}
        </nav>
      </MarketingBand>
      <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden">
        <div className="grid grid-cols-[1fr_2fr] gap-10 px-7 py-10 max-sm:px-4 max-md:grid-cols-1 max-md:gap-6">
          <div>
            <h2 className="text-xl">{content.machineTitle}</h2>
            <p className="mt-3 max-w-[34ch] text-foreground-dimmed text-sm leading-relaxed">
              {content.machineDescription}
            </p>
          </div>
          <nav aria-label={content.machineNavigation}>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-2 max-sm:grid-cols-1">
              {RECOVERY_LINKS.map((link, index) => {
                const copy = content.recoveryLinks[index];
                if (!copy) return null;
                const href =
                  link.href === "/" || link.href === "/docs"
                    ? localizePath(link.href, locale)
                    : link.href;
                return (
                  <li key={link.href}>
                    <a
                      className="marketing-text-link inline-flex min-h-11 items-center text-primary-text text-sm underline decoration-accent-foreground underline-offset-4 hover:decoration-current"
                      href={href}
                    >
                      {copy.label}
                    </a>
                  </li>
                );
              })}
              <li>
                <a
                  className="marketing-text-link inline-flex min-h-11 items-center text-primary-text text-sm underline decoration-accent-foreground underline-offset-4 hover:decoration-current"
                  href="/404.md"
                >
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
