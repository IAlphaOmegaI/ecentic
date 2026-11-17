import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import { redHatDisplay, superior } from "@/components/fonts";
import { isLocale, locales } from "@/i18n/locales";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Outbound · ecentic", template: "%s · Outbound" },
  robots: { index: false, follow: false },
};

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} className="light">
      <body
        className={`${redHatDisplay.variable} ${superior.variable} min-h-dvh antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
