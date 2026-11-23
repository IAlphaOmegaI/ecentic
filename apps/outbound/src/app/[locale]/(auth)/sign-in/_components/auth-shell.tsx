import {
  CheckBadgeIcon,
  EnvelopeIcon,
  GlobeSearchIcon,
  ShieldCheckIcon,
} from "@zenncore/icons";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { type ReactNode, Suspense } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Link } from "@/i18n/navigation";
import { Crosshair } from "../../../(workspace)/_components/grid";

const steps = [
  { key: "research", icon: GlobeSearchIcon },
  { key: "review", icon: CheckBadgeIcon },
  { key: "conversation", icon: EnvelopeIcon },
] as const;

export const AuthShell = async ({ children }: AuthShell.Props) => {
  const translate = await getTranslations("outbound.auth");
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
            aria-label={translate("home")}
            className="rounded-sm focus-visible:outline-2 focus-visible:outline-background-rich focus-visible:outline-offset-4"
          >
            <Image
              src="/images/marketing/trademark-on-dark.svg"
              alt="ecentic"
              width={1022}
              height={257}
              className="h-auto w-36"
              priority
            />
          </Link>
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-10 py-8 xl:px-14">
          <p className="shrink-0 font-medium text-background-rich/75 text-sm">
            {translate("story.label")}
          </p>
          <p className="mt-4 max-w-lg shrink-0 text-balance font-heading font-medium text-4xl leading-tight xl:text-5xl">
            {translate("story.title")}
          </p>
          <p className="mt-6 max-w-md shrink-0 text-background-rich/85 text-base leading-relaxed">
            {translate("story.description")}
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
        <div className="relative isolate grid shrink-0 grid-cols-3 gap-4 px-10 pt-10 pb-8 text-foreground xl:px-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-background-rich [clip-path:polygon(0_16px,24px_16px,40px_0,calc(100%_-_40px)_0,calc(100%_-_24px)_16px,100%_16px,100%_100%,0_100%)]"
          />
          {steps.map(({ key, icon: Icon }) => (
            <div key={key} className="flex min-w-0 flex-col gap-4">
              <Icon aria-hidden className="size-4 text-primary-text" />
              <p className="font-medium text-foreground-rich text-sm">
                {translate(`story.steps.${key}`)}
              </p>
            </div>
          ))}
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-col lg:overflow-hidden">
        <header className="relative flex min-h-20 shrink-0 items-center justify-between gap-4 border-accent-foreground border-b px-6 sm:px-10 lg:min-h-24">
          <Crosshair className="bottom-0 left-0 hidden -translate-x-1/2 translate-y-1/2 lg:block" />
          <Link
            href="/"
            aria-label={translate("home")}
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
            <span className="hidden lg:inline">{translate("home")}</span>
          </Link>
          <Suspense fallback={<div aria-hidden className="h-10 w-20" />}>
            <LanguageSwitcher />
          </Suspense>
        </header>
        <main
          aria-labelledby="outbound-sign-in-title"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: The form pane is a keyboard-scrollable desktop region.
          tabIndex={0}
          className="min-h-0 min-w-0 flex-1 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px] lg:overflow-y-auto lg:overscroll-contain"
        >
          <div className="mx-auto flex min-h-full w-full max-w-xl flex-col justify-center px-6 py-10 sm:px-10 sm:py-12 lg:py-14">
            <div className="mb-8">
              <h1
                id="outbound-sign-in-title"
                className="text-balance font-heading font-medium text-3xl text-foreground-rich leading-tight sm:text-4xl"
              >
                {translate("title")}
              </h1>
              <p className="mt-4 text-pretty text-base text-foreground-dimmed leading-relaxed">
                {translate("description")}
              </p>
            </div>
            {children}
            <p className="mt-8 flex items-start gap-2 border-accent-foreground border-t pt-6 text-foreground-dimmed text-sm leading-relaxed">
              <ShieldCheckIcon
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-primary-text"
              />
              {translate("accessNote")}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export namespace AuthShell {
  export type Props = { children: ReactNode };
}
