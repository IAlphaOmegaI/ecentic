import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { PropsWithChildren } from "react";
import { CookieConsent } from "@/components/cookie-consent";
import { HtmlLang } from "@/components/html-lang";
import { LanguageSwitcher } from "@/components/language-switcher";
import { openGraphLocale } from "@/i18n/locale";
import { routing } from "@/i18n/routing";

type LocaleLayoutProps = PropsWithChildren<{
  params: Promise<{ locale: string }>;
}>;

export const generateStaticParams = () =>
  routing.locales.map((locale) => ({ locale }));

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string }>;
}) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  return {
    openGraph: {
      locale: openGraphLocale(locale),
    },
    alternates: {
      languages: {
        en: "/",
        es: "/es",
      },
    },
  };
};

export default async ({ children, params }: LocaleLayoutProps) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLang locale={locale} />
      {children}
      <LanguageSwitcher />
      {/* Must sit under NextIntlClientProvider — `useTranslations` / locale
          `Link` break if this stays in the root layout (e.g. `/_not-found`). */}
      <CookieConsent />
    </NextIntlClientProvider>
  );
};
