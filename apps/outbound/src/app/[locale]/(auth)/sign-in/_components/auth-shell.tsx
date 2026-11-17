import { CheckBadgeIcon, EnvelopeIcon, GlobeSearchIcon } from "@zenncore/icons";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { type ReactNode, Suspense } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Link } from "@/i18n/navigation";

const steps = [
  { key: "research", icon: GlobeSearchIcon },
  { key: "review", icon: CheckBadgeIcon },
  { key: "conversation", icon: EnvelopeIcon },
] as const;

export const AuthShell = async ({ children }: { children: ReactNode }) => {
  const t = await getTranslations("outbound.auth");
  return (
    <div className="grid min-h-dvh bg-background-rich lg:h-dvh lg:min-h-0 lg:grid-cols-[0.9fr_1.1fr] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
      <aside className="relative isolate hidden min-h-0 min-w-0 flex-col overflow-hidden border-accent-foreground border-r text-background-rich lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-primary-text via-primary to-emphasis [clip-path:polygon(0_0,calc(100%_-_24px)_0,100%_24px,100%_100%,0_100%)]"
        />
        <div className="flex min-h-24 shrink-0 items-center px-10 xl:px-14">
          <Link
            href="/"
            aria-label={t("home")}
            className="rounded-sm focus-visible:outline-2 focus-visible:outline-background-rich focus-visible:outline-offset-4"
          >
            <Image
              src="/images/marketing/trademark-on-dark.svg"
              alt="ecentic"
              width={140}
              height={35}
              className="h-auto w-36"
              priority
            />
          </Link>
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-10 py-8 xl:px-14">
          <p className="shrink-0 font-medium text-background-rich/75 text-sm">
            {t("story.label")}
          </p>
          <h2 className="mt-4 max-w-lg shrink-0 text-balance font-heading font-medium text-4xl leading-tight xl:text-5xl">
            {t("story.title")}
          </h2>
          <p className="mt-6 max-w-md shrink-0 text-background-rich/85 text-base leading-relaxed">
            {t("story.description")}
          </p>
          <div className="relative mt-6 min-h-0 flex-1">
            <Image
              src="/images/marketing/og-commerce.png"
              alt=""
              fill
              unoptimized
              loading="eager"
              className="object-contain"
            />
          </div>
        </div>
        <div className="relative isolate grid shrink-0 grid-cols-3 gap-4 px-10 pt-9 pb-8 text-foreground xl:px-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-background-rich [clip-path:polygon(0_16px,24px_16px,40px_0,calc(100%_-_40px)_0,calc(100%_-_24px)_16px,100%_16px,100%_100%,0_100%)]"
          />
          {steps.map(({ key, icon: Icon }) => (
            <div key={key} className="flex min-w-0 flex-col gap-3">
              <Icon aria-hidden className="size-5 text-primary-text" />
              <p className="font-medium text-foreground-rich text-sm">
                {t(`story.steps.${key}`)}
              </p>
            </div>
          ))}
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-col lg:overflow-hidden">
        <header className="relative flex min-h-20 shrink-0 items-center justify-between gap-4 border-accent-foreground border-b px-6 sm:px-10 lg:min-h-24">
          <Link
            href="/"
            aria-label={t("home")}
            className="inline-flex items-center gap-2 rounded-sm text-foreground-dimmed text-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Image
              src="/images/trademark.svg"
              alt="ecentic"
              width={110}
              height={32}
              className="h-auto w-28 lg:hidden"
              priority
            />
            <span className="hidden lg:inline">{t("home")}</span>
          </Link>
          <Suspense fallback={<div aria-hidden className="h-10 w-20" />}>
            <LanguageSwitcher />
          </Suspense>
        </header>
        <main
          aria-label={t("title")}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: The form pane is a keyboard-scrollable desktop region.
          tabIndex={0}
          className="min-h-0 min-w-0 flex-1 focus-visible:outline-2 focus-visible:outline-primary lg:overflow-y-auto lg:overscroll-contain"
        >
          <div className="mx-auto flex min-h-full w-full max-w-xl flex-col justify-center px-6 py-10 sm:px-10 sm:py-12 lg:py-14">
            <div className="mb-8">
              <h1 className="text-balance font-heading font-medium text-3xl text-foreground-rich leading-tight sm:text-4xl">
                {t("title")}
              </h1>
              <p className="mt-3 text-pretty text-base text-foreground-dimmed leading-relaxed">
                {t("description")}
              </p>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
