import { defineRouting } from "next-intl/routing";
import { defaultLocale, publishedLocales } from "./locales";

export { isLocale, type Locale } from "./locales";

export const routing = defineRouting({
  locales: publishedLocales,
  defaultLocale,
  localePrefix: "as-needed",
});
