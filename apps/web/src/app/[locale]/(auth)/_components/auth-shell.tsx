import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

/** One quiet workspace for account entry, recovery and verification. */
export const AuthShell = async ({
  title,
  description,
  children,
  footer,
  introduction,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  introduction?: ReactNode;
}) => {
  const translate = await getTranslations("authUX");

  return (
    <div className="grid min-h-dvh bg-background-rich lg:h-dvh lg:min-h-0 lg:grid-cols-[0.9fr_1.1fr] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
      <aside className="relative isolate hidden min-h-0 min-w-0 flex-col overflow-hidden border-accent-foreground border-r text-background-rich lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-primary-text via-primary to-emphasis [clip-path:polygon(0_0,calc(100%_-_24px)_0,100%_24px,100%_100%,0_100%)]"
        />
        <div className="flex min-h-24 shrink-0 items-center px-10 xl:px-14">
          <Link href="/" aria-label={translate("home")}>
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
            {translate("sidebar.eyebrow")}
          </p>
          <p className="mt-4 max-w-lg shrink-0 text-balance font-heading font-medium text-4xl leading-none xl:text-5xl">
            {translate("sidebar.title")}
          </p>
          <p className="mt-6 max-w-md shrink-0 text-background-rich/85 text-base leading-relaxed">
            {translate("sidebar.description")}
          </p>
          <div className="relative mt-6 min-h-0 flex-1">
            <Image
              src="/images/marketing/og-commerce.png"
              alt=""
              fill
              unoptimized
              className="object-contain"
            />
          </div>
        </div>
        <div className="relative isolate grid shrink-0 grid-cols-2 gap-6 px-10 py-8 text-foreground xl:px-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-background-rich [clip-path:polygon(0_16px,24px_16px,40px_0,calc(100%_-_40px)_0,calc(100%_-_24px)_16px,100%_16px,100%_100%,0_100%)]"
          />
          <div className="min-w-0">
            <p className="mb-4 text-foreground-dimmed text-sm">
              {translate("sidebar.catalogs")}
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <Image
                src="/images/shopify.svg"
                alt="Shopify"
                width={28}
                height={32}
                className="h-7 w-auto"
              />
              <Image
                src="/images/woocommerce.svg"
                alt="WooCommerce"
                width={64}
                height={32}
                className="h-6 w-auto max-w-16"
              />
            </div>
          </div>
          <div className="min-w-0">
            <p className="mb-4 text-foreground-dimmed text-sm">
              {translate("sidebar.channels")}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {[
                { name: "ChatGPT", src: "/images/chatgpt.svg" },
                { name: "Claude", src: "/images/claude.svg" },
                { name: "Gemini", src: "/images/gemini.svg" },
                { name: "Perplexity", src: "/images/perplexity.svg" },
              ].map(({ name, src }) => (
                <Image
                  key={name}
                  src={src}
                  alt={name}
                  width={26}
                  height={26}
                  className="size-6 object-contain"
                />
              ))}
            </div>
          </div>
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-col lg:overflow-hidden">
        <header className="relative flex min-h-20 shrink-0 items-center justify-between gap-4 border-accent-foreground border-b px-6 sm:px-10 lg:min-h-24">
          <Plus className="bottom-0 left-0 hidden -translate-x-1/2 translate-y-1/2 lg:block" />
          <Link
            href="/"
            aria-label={translate("home")}
            className="inline-flex items-center gap-2 text-foreground-dimmed text-sm hover:text-foreground"
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
          <LanguageSwitcher />
        </header>
        <main
          aria-label={title}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: The form pane is the desktop scroll region and must support keyboard scrolling.
          tabIndex={0}
          className="min-h-0 min-w-0 flex-1 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px] lg:overflow-y-auto lg:overscroll-contain"
        >
          <div className="mx-auto flex min-h-full w-full max-w-xl flex-col justify-center px-6 py-10 sm:px-10 sm:py-12 lg:py-14">
            <div className="mb-7">
              <h1 className="text-balance font-heading font-medium text-3xl text-foreground-rich leading-tight sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 text-pretty text-base text-foreground-dimmed leading-relaxed">
                {description}
              </p>
              {introduction ? <div className="mt-5">{introduction}</div> : null}
            </div>
            {children}
            {footer ? (
              <div className="mt-8 border-accent-foreground border-t pt-6 text-foreground-dimmed text-sm leading-relaxed">
                {footer}
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
};

export const AuthFormSkeleton = () => (
  <div aria-hidden className="space-y-4">
    <div className="h-10 rounded-sm bg-accent" />
    <div className="h-10 rounded-sm bg-accent" />
    <div className="h-6" />
    <div className="h-16 rounded-sm bg-accent" />
    <div className="h-16 rounded-sm bg-accent" />
    <div className="h-10 rounded-sm bg-accent" />
  </div>
);
