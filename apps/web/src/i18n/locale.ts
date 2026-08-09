import type { Locale } from "./routing";
import { routing } from "./routing";

/** Strip a leading locale segment (`/es/...` → `/...`). */
export const stripLocalePrefix = (pathname: string) => {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`))
      return pathname.slice(locale.length + 1);
  }
  return pathname;
};

/** Read the locale prefix from a pathname, defaulting to `en`. */
export const localeFromPathname = (pathname: string): Locale => {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`))
      return locale;
  }
  return routing.defaultLocale;
};

/** Prefix a path for the given locale (`as-needed`: only non-default). */
export const localizePath = (pathname: string, locale: Locale) => {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (locale === routing.defaultLocale) return path;
  if (path === "/") return `/${locale}`;
  return `/${locale}${path}`;
};

export const openGraphLocale = (locale: Locale) => {
  switch (locale) {
    case "es":
      return "es_ES";
    case "en":
      return "en_US";
    default: {
      const exhaustive: never = locale;
      return exhaustive;
    }
  }
};
