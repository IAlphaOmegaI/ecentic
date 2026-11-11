import { cn } from "@zenncore/utils";
import { headers } from "next/headers";
import { fonts } from "@/components/marketing/fonts";
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

const recoveryLocale = async () =>
  (await headers()).get("x-next-intl-locale") === "es" ? "es" : "en";

export const generateMetadata = async () =>
  recoveryMetadata(await recoveryLocale());

export default async () => {
  const locale = await recoveryLocale();
  return (
    <html lang={locale}>
      <body
        className={cn(
          "marketing-grid-pattern marketing-site text-(length:--text-base) bg-background font-body text-foreground leading-[1.6] [--rail-color:var(--color-accent-foreground)] [--rail-cross:var(--color-cross)] [color-scheme:light] [font-synthesis:none] motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:scroll-auto motion-reduce:[&_*]:transition-none [&_:where(a,button).bg-primary]:rounded-md [&_:where(a,button).bg-primary]:bg-primary-text [&_:where(a,button).from-primary-rich]:rounded-md [&_:where(a,button,input,select,textarea):focus-visible]:outline-2 [&_:where(a,button,input,select,textarea):focus-visible]:outline-primary-text [&_:where(a,button,input,select,textarea):focus-visible]:outline-offset-4 [&_:where(button,[role=button])]:duration-160 [&_:where(button,[role=button])]:ease-[cubic-bezier(0.23,1,0.32,1)] [&_:where(div:has(>input),div:has(>textarea))]:rounded-md [&_:where(input,textarea,select,[role=combobox])]:rounded-md [&_p]:text-pretty [:where(&)_:where(h1)]:max-w-[1040px] [:where(&)_:where(h1)]:text-[clamp(2.75rem,5.5vw,5rem)] [:where(&)_:where(h1,h2,h3,h4)]:text-balance [:where(&)_:where(h1,h2,h3,h4)]:font-heading [:where(&)_:where(h1,h2,h3,h4)]:font-medium [:where(&)_:where(h1,h2,h3,h4)]:text-foreground-rich [:where(&)_:where(h1,h2,h3,h4)]:leading-[1.08] [:where(&)_:where(h1,h2,h3,h4)]:tracking-[-0.035em] [:where(&)_:where(h2)]:max-w-[900px] [:where(&)_:where(h2)]:text-[clamp(2rem,3.6vw,3.5rem)] [:where(&)_:where(h3)]:text-[clamp(1.4rem,2vw,1.85rem)]",
          fonts,
        )}
      >
        <NotFoundContent locale={locale} />
      </body>
    </html>
  );
};
