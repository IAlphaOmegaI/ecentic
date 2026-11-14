import { cn } from "@zenncore/utils";
import { headers } from "next/headers";
import { fonts } from "@/components/marketing/fonts";
import { defaultLocale, isPublishedLocale } from "@/i18n/locales";
import {
  NotFoundContent,
  recoveryMetadata,
} from "./_components/not-found-content";
import "./globals.css";

// A global 404 bypasses the locale layout. Its request locale determines the
// document's <html lang> before any bytes are sent. Blocking only this boundary
// keeps the response a real 404; streaming through the locale layout can flush
// HTTP 200 before notFound() is handled. Normal pages retain instant rendering.
export const instant = false;

const recoveryLocale = async () => {
  const locale = (await headers()).get("x-next-intl-locale");
  return locale && isPublishedLocale(locale) ? locale : defaultLocale;
};

export const generateMetadata = async () =>
  recoveryMetadata(await recoveryLocale());

export default async () => {
  const locale = await recoveryLocale();
  return (
    <html lang={locale}>
      <body
        className={cn(
          "marketing-grid-pattern marketing-site text-(length:--text-base) bg-background font-body text-foreground leading-relaxed [--rail-color:var(--color-accent-foreground)] [--rail-cross:var(--color-cross)] [color-scheme:light] [font-synthesis:none] motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:scroll-auto motion-reduce:[&_*]:transition-none [&_:where(a,button).bg-primary]:rounded-sm [&_:where(a,button).bg-primary]:bg-primary-text [&_:where(a,button).from-primary-rich]:rounded-sm [&_:where(a,button,input,select,textarea):focus-visible]:outline-2 [&_:where(a,button,input,select,textarea):focus-visible]:outline-primary-text [&_:where(a,button,input,select,textarea):focus-visible]:outline-offset-4 [&_:where(button,[role=button])]:duration-160 [&_:where(button,[role=button])]:ease-[cubic-bezier(0.23,1,0.32,1)] [&_:where(div:has(>input),div:has(>textarea))]:rounded-sm [&_:where(input,textarea,select,[role=combobox])]:rounded-sm [&_p]:text-pretty [:where(&)_:where(h1)]:max-w-260 [:where(&)_:where(h1)]:text-5xl lg:[:where(&)_:where(h1)]:text-6xl xl:[:where(&)_:where(h1)]:text-7xl [:where(&)_:where(h1,h2,h3,h4)]:text-balance [:where(&)_:where(h1,h2,h3,h4)]:font-heading [:where(&)_:where(h1,h2,h3,h4)]:font-medium [:where(&)_:where(h1,h2,h3,h4)]:text-foreground-rich [:where(&)_:where(h1,h2,h3,h4)]:leading-none [:where(&)_:where(h1,h2,h3,h4)]:tracking-tight [:where(&)_:where(h2)]:max-w-225 [:where(&)_:where(h2)]:text-3xl lg:[:where(&)_:where(h2)]:text-4xl xl:[:where(&)_:where(h2)]:text-5xl 2xl:[:where(&)_:where(h2)]:text-6xl [:where(&)_:where(h3)]:text-2xl 2xl:[:where(&)_:where(h3)]:text-3xl",
          fonts,
        )}
      >
        <NotFoundContent locale={locale} />
      </body>
    </html>
  );
};
