import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { type ReactNode, Suspense } from "react";
import { CustomHairlineFigure } from "@/components/hairline/custom-figure";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  MarketingBand,
  MarketingFeatureBand,
} from "@/components/marketing/primitives";
import { Link } from "@/i18n/navigation";

export const ShareShell = async ({ children }: { children: ReactNode }) => {
  const translate = await getTranslations("share");
  const general = await getTranslations("authUX");

  return (
    <div className="marketing-grid-pattern min-h-dvh bg-background font-body text-foreground [--rail-color:var(--color-accent-foreground)] [--rail-cross:var(--color-foreground-dimmed)]">
      <MarketingBand className="border-b-0 bg-background-rich">
        <header className="flex min-h-20 items-center justify-between gap-4 border-accent-foreground border-b px-4 py-4 sm:px-6">
          <Link href="/" aria-label={general("home")}>
            <Image
              src="/images/trademark.svg"
              alt="ecentic"
              width={110}
              height={32}
              className="h-auto w-28"
              priority
            />
          </Link>
          <Suspense fallback={<LanguageSkeleton />}>
            <LanguageSwitcher />
          </Suspense>
        </header>
        <div className="grid grid-cols-3 items-center gap-4 px-4 py-8 sm:grid-cols-4 sm:gap-x-8 sm:px-6 sm:py-10">
          <h1 className="col-span-2 min-w-0 max-w-3xl text-balance font-heading font-semibold text-3xl text-foreground-rich leading-tight sm:col-span-3 sm:text-5xl">
            {translate("review.title")}
          </h1>
          <p className="col-span-3 max-w-2xl text-pretty text-base text-foreground-dimmed leading-relaxed">
            {translate("review.description")}
          </p>
          <div
            aria-hidden
            className="col-start-3 row-start-1 w-24 justify-self-end sm:col-start-4 sm:row-span-2 sm:w-44"
          >
            <CustomHairlineFigure
              name="report-printer"
              label=""
              surface="rich"
              className="bg-transparent"
            />
          </div>
        </div>
      </MarketingBand>
      <main>{children}</main>
    </div>
  );
};

export const ShareCallToAction = async () => {
  const translate = await getTranslations("share");
  return (
    <MarketingBand className="border-t-0 bg-background-rich">
      <div className="flex flex-col gap-5 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-6 sm:py-8">
        <div className="min-w-0">
          <h2 className="font-heading font-semibold text-2xl text-foreground-rich">
            {translate("review.cta.title")}
          </h2>
          <p className="mt-2 text-foreground-dimmed leading-relaxed">
            {translate("review.cta.description")}
          </p>
        </div>
        <div className="w-fit shrink-0">
          <Button color="primary" render={<Link href="/sign-up" />}>
            {translate("cta.action")}
            <ArrowRightIcon aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
    </MarketingBand>
  );
};

const LanguageSkeleton = () => (
  <div
    aria-hidden
    className="h-10 w-20 animate-pulse rounded-lg bg-accent-foreground/30 motion-reduce:animate-none"
  />
);

export const ShareReportSkeleton = () => (
  <>
    <MarketingFeatureBand tone="dark" aria-busy="true">
      <div aria-hidden className="animate-pulse motion-reduce:animate-none">
        <div className="flex flex-wrap gap-4 border-background-rich/15 border-b px-4 py-4 sm:px-6">
          <div className="h-5 w-44 bg-background-rich/20" />
          <div className="h-5 w-32 bg-background-rich/10" />
        </div>
        <div className="grid lg:grid-cols-3">
          <div className="flex min-w-0 flex-col px-4 py-6 sm:px-6">
            <div className="mx-auto my-4 flex aspect-square w-full max-w-72 flex-col items-center justify-center gap-4 rounded-full border-8 border-background-rich/10">
              <div className="h-16 w-32 bg-background-rich/20" />
              <div className="h-4 w-40 bg-background-rich/10" />
            </div>
            <div className="mt-4 h-4 w-full bg-background-rich/10" />
            <div className="mt-2 h-4 w-3/4 bg-background-rich/10" />
            <div className="mt-6 grid grid-cols-2 gap-6 border-background-rich/15 border-t pt-5">
              {["wins", "losses"].map((key) => (
                <div key={key} className="space-y-2">
                  <div className="h-4 w-20 bg-background-rich/10" />
                  <div className="h-9 w-16 bg-background-rich/20" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex min-w-0 flex-col border-background-rich/15 border-t lg:col-span-2 lg:border-t-0 lg:border-l">
            <div className="space-y-3 border-background-rich/15 border-b px-4 py-6 sm:px-6">
              <div className="h-6 w-48 bg-background-rich/20" />
              <div className="h-4 w-3/4 bg-background-rich/10" />
            </div>
            {["gpt", "claude", "gemini", "perplexity"].map((key) => (
              <div
                key={key}
                className="flex flex-1 items-center gap-4 border-background-rich/15 border-b px-4 py-5 last:border-b-0 sm:px-6"
              >
                <div className="size-10 shrink-0 rounded-lg bg-background-rich/20" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-5 w-24 bg-background-rich/20" />
                  <div className="h-4 w-36 max-w-full bg-background-rich/10" />
                </div>
                <div className="h-7 w-16 shrink-0 bg-background-rich/20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </MarketingFeatureBand>
    <MarketingBand aria-busy="true" className="border-t-0 bg-background-rich">
      <div
        aria-hidden
        className="grid animate-pulse gap-6 px-4 py-8 motion-reduce:animate-none sm:px-6 sm:py-10 md:grid-cols-3 md:gap-10"
      >
        <div className="min-w-0 space-y-5 md:col-span-2">
          <div className="h-6 w-40 bg-accent-foreground/30" />
          <div className="h-8 w-80 max-w-full bg-accent-foreground/30" />
          <div className="h-4 w-full bg-accent-foreground/20" />
          <div className="h-4 w-3/4 bg-accent-foreground/20" />
          <div className="h-8 w-full bg-accent-foreground/20" />
        </div>
        <div className="space-y-5 border-accent-foreground border-t pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-8">
          <div className="h-14 w-32 bg-accent-foreground/30" />
          <div className="h-4 w-full bg-accent-foreground/20" />
          <div className="h-10 w-32 rounded-lg bg-accent-foreground/30" />
        </div>
      </div>
    </MarketingBand>
  </>
);
