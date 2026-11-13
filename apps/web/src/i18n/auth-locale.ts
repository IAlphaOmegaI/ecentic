import { localeFromPathname } from "./locale";
import { defaultLocale, isPublishedLocale, type Locale } from "./locales";

/** Read language intent only; authentication still validates redirect targets. */
export const localeFromAuthLink = (
  link: string,
  requestHeaders?: Headers,
): Locale => {
  const url = URL.parse(link, "https://ecentic.ai");
  const callback =
    url?.searchParams.get("callbackURL") ?? url?.searchParams.get("redirectTo");
  const destination = callback
    ? URL.parse(callback, "https://ecentic.ai")
    : null;
  if (destination) return localeFromPathname(destination.pathname);
  const headerLocale = requestHeaders?.get("x-next-intl-locale");
  if (headerLocale && isPublishedLocale(headerLocale)) return headerLocale;
  const referer = URL.parse(requestHeaders?.get("referer") ?? "");
  if (referer) return localeFromPathname(referer.pathname);
  return defaultLocale;
};
