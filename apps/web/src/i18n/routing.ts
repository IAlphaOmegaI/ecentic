import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  // The pathname alone decides the locale. With detection on, `/` answered a
  // Spanish `Accept-Language` (or a stale `NEXT_LOCALE` cookie) with a 307 to
  // `/es`, so the English homepage was unreachable for those visitors and for
  // any crawler sending the header — Google advises against exactly that.
  // hreflang in each page's head already points every client at `/es`.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

export const isLocale = (value: string): value is Locale =>
  (routing.locales as readonly string[]).includes(value);
