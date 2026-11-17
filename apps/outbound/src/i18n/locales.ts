/** Shared by routes, server jobs and scripts without loading next-intl. */
export const locales = ["en", "es", "fr", "de", "it", "ja", "zh-CN"] as const;
export type Locale = (typeof locales)[number];
export const publishedLocales = locales;
export const defaultLocale: Locale = "en";
export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);
