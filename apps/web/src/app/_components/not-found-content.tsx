import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { getMessages } from "next-intl/server";
import { AsciiClosingArtwork } from "@/components/marketing/ascii-artwork";
import { AsciiAtmosphere } from "@/components/marketing/ascii-atmosphere";
import { MarketingBand } from "@/components/marketing/primitives";
import { localizePath } from "@/i18n/locale";
import type { Locale } from "@/i18n/routing";
import { notFoundMarkdown, RECOVERY_LINKS } from "@/lib/not-found";
import { seo } from "@/lib/seo";

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

export const NotFoundContent = async ({ locale }: NotFoundContent.Props) => {
  const { enterpriseRecovery, enterpriseChrome } = await getMessages({
    locale,
  });
  const content = enterpriseRecovery.notFound;
  return (
    <main id="main-content">
      <MarketingBand className="marketing-hero">
        <div className="marketing-cell relative min-w-0 px-7 py-24 max-sm:px-4 max-sm:py-14">
          <a
            href={localizePath("/", locale)}
            aria-label={content.home}
            className="marketing-text-link text-primary-text underline decoration-1 underline-offset-4"
          >
            ecentic
          </a>
          <p className="mt-16 mb-6 flex items-center gap-2.5 text-primary-text">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-current"
            />
            404
          </p>
          <h1>{content.title}</h1>
          <p className="marketing-lead mt-6 max-w-[720px] text-[clamp(1.125rem,1.6vw,1.35rem)] leading-[1.55]">
            {content.description}
          </p>
        </div>
      </MarketingBand>
      <MarketingBand>
        <nav
          aria-label={content.navigation}
          data-columns="3"
          className="marketing-grid grid grid-cols-3 border-[var(--rail-color)] border-b max-sm:grid-cols-1 max-[801px]:grid-cols-2 [&>a:hover]:bg-background-dimmed [&>a]:border-[var(--rail-color)] [&>a]:border-t [&>a]:border-r [&>a]:px-7 [&>a]:py-8 [&>a]:text-primary-text [&>a]:text-xl max-sm:[&>a]:border-r-0 max-sm:[&>a]:px-4"
        >
          {content.links.map((link) => (
            <a key={link.href} href={localizePath(link.href, locale)}>
              {link.label}
            </a>
          ))}
        </nav>
      </MarketingBand>
      <MarketingBand>
        <div className="marketing-cell relative min-w-0 px-7 py-24 max-sm:px-4 max-sm:py-14 [&>h2+p]:mt-6 [&>p]:max-w-[70ch]">
          <h2>{content.machineTitle}</h2>
          <p>{content.machineDescription}</p>
          <nav aria-label={content.machineNavigation} className="mt-10">
            <ul className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {RECOVERY_LINKS.map((link, index) => {
                const copy = content.recoveryLinks[index];
                if (!copy) return null;
                return (
                  <li
                    key={link.href}
                    className="border-accent-foreground border-t py-6"
                  >
                    <a
                      className="marketing-text-link text-primary-text underline decoration-1 underline-offset-4"
                      href={link.href}
                    >
                      {copy.label}
                    </a>
                    <p className="mt-2 text-sm">{copy.description}</p>
                  </li>
                );
              })}
            </ul>
          </nav>
          <h3 className="mt-12">{content.markdownTitle}</h3>
          <a
            className="marketing-text-link mt-6 inline-block text-primary-text underline decoration-1 underline-offset-4"
            href="/404.md"
          >
            {content.markdownAction}
          </a>
          <pre className="mt-6 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
            {notFoundMarkdown()}
          </pre>
        </div>
      </MarketingBand>
      <MarketingBand className="marketing-closing marketing-dark text-background-rich/82 [--rail-color:color-mix(in_oklab,var(--color-background-rich)_30%,transparent)] [--rail-cross:color-mix(in_oklab,var(--color-background-rich)_55%,transparent)] [&>.marketing-rail]:bg-[linear-gradient(165deg,var(--color-band-start)_25%,var(--color-band-middle)_66%,var(--color-band-end))] [&_:is(h2,h3)]:text-background-rich">
        <AsciiAtmosphere className="marketing-closing-art pointer-events-none absolute inset-0 text-background-rich opacity-20 [mask-image:linear-gradient(100deg,transparent,black)]">
          <AsciiClosingArtwork />
        </AsciiAtmosphere>
        <div className="marketing-cell relative flex min-h-[460px] min-w-0 flex-col justify-center px-7 py-24 max-sm:min-h-[440px] max-sm:px-4 max-sm:py-14">
          <h2 className="max-w-[780px]">{enterpriseChrome.closing.title}</h2>
          <p className="mt-6 max-w-[720px] text-[clamp(1.125rem,1.6vw,1.35rem)] leading-[1.55]">
            {enterpriseChrome.closing.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3 max-sm:gap-2.5 [&>a]:min-h-[46px] [&>a]:px-[18px] [&>a]:py-2.5 [&>a]:text-[15px] max-sm:[&>a]:whitespace-normal max-sm:[&>a]:text-left">
            <Button
              variant="flat"
              color="accent"
              className="rounded-md bg-background-rich text-foreground-rich"
              render={<a href={localizePath("/demo", locale)} />}
            >
              {enterpriseChrome.action.primary}
            </Button>
            <Button
              variant="outline"
              color="accent"
              className="rounded-xs border-background-rich/60 text-background-rich"
              render={<a href={localizePath("/sign-up", locale)} />}
            >
              {enterpriseChrome.action.secondary}
            </Button>
          </div>
        </div>
      </MarketingBand>
    </main>
  );
};

export namespace NotFoundContent {
  export type Props = { locale: Locale };
}
