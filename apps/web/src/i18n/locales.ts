/** Shared by routing, server jobs and scripts without loading next-intl. */
export const locales = ["en", "es", "fr", "de", "it", "ja", "zh-CN"] as const;

export type Locale = (typeof locales)[number];

/** Expose a language only after its complete catalog has passed review. */
export const publishedLocales: readonly Locale[] = ["en", "es", "fr", "de"];

export const isPublishedLocale = (value: string): value is Locale =>
  (publishedLocales as readonly string[]).includes(value);

export const defaultLocale: Locale = "en";

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

export const localeMetadata = {
  en: {
    name: "English",
    nativeName: "English",
    intlLocale: "en-US",
    openGraphLocale: "en_US",
    shortLabel: "EN",
    flagSrc: "/images/united-states-flag.svg",
    labelKey: "language.english",
  },
  es: {
    name: "Spanish",
    nativeName: "Español",
    intlLocale: "es-ES",
    openGraphLocale: "es_ES",
    shortLabel: "ES",
    flagSrc: "/images/spain-flag.svg",
    labelKey: "language.spanish",
  },
  fr: {
    name: "French",
    nativeName: "Français",
    intlLocale: "fr-FR",
    openGraphLocale: "fr_FR",
    shortLabel: "FR",
    flagSrc: "/images/france-flag.svg",
    labelKey: "language.french",
  },
  de: {
    name: "German",
    nativeName: "Deutsch",
    intlLocale: "de-DE",
    openGraphLocale: "de_DE",
    shortLabel: "DE",
    flagSrc: "/images/germany-flag.svg",
    labelKey: "language.german",
  },
  it: {
    name: "Italian",
    nativeName: "Italiano",
    intlLocale: "it-IT",
    openGraphLocale: "it_IT",
    shortLabel: "IT",
    flagSrc: "/images/italy-flag.svg",
    labelKey: "language.italian",
  },
  ja: {
    name: "Japanese",
    nativeName: "日本語",
    intlLocale: "ja-JP",
    openGraphLocale: "ja_JP",
    shortLabel: "JA",
    flagSrc: "/images/japan-flag.svg",
    labelKey: "language.japanese",
  },
  "zh-CN": {
    name: "Simplified Chinese",
    nativeName: "简体中文",
    intlLocale: "zh-CN",
    openGraphLocale: "zh_CN",
    shortLabel: "中文",
    flagSrc: "/images/china-flag.svg",
    labelKey: "language.simplifiedChinese",
  },
} as const satisfies Record<
  Locale,
  {
    name: string;
    nativeName: string;
    intlLocale: string;
    openGraphLocale: string;
    shortLabel: string;
    flagSrc: string;
    labelKey: string;
  }
>;
