import { type Locale, localeMetadata } from "@/i18n/locales";

/** Keep non-Latin topic names usable; URLs are derived by code, never the model. */
export const blogTopicSlug = (value: string) =>
  value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");

export const blogDate = (value: Date | string, locale: Locale) =>
  new Intl.DateTimeFormat(localeMetadata[locale].intlLocale, {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(
    value instanceof Date
      ? value
      : new Date(value.includes("T") ? value : `${value}T00:00:00Z`),
  );

export const blogReadingMinutes = (text: string, locale: Locale) => {
  const plain = text.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
  const segments = new Intl.Segmenter(localeMetadata[locale].intlLocale, {
    granularity: "word",
  }).segment(plain);
  const words = [...segments].filter((segment) => segment.isWordLike).length;
  return Math.max(1, Math.ceil(words / 200));
};
