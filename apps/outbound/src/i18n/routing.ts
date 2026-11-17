import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "./locales";

export { isLocale, type Locale } from "./locales";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: false,
});
