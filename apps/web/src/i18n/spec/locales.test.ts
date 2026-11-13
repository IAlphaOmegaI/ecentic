import { describe, expect, test } from "bun:test";
import { localeFromAuthLink } from "../auth-locale";
import {
  localeFromPathname,
  localizePath,
  openGraphLocale,
  stripLocalePrefix,
} from "../locale";
import {
  isLocale,
  isPublishedLocale,
  localeMetadata,
  publishedLocales,
} from "../locales";

describe("supported web locales", () => {
  test.each([...publishedLocales])(
    "round-trips %s paths and exposes valid format metadata",
    (locale) => {
      const path = localizePath("/platform/connect", locale);
      expect(localeFromPathname(path)).toBe(locale);
      expect(stripLocalePrefix(path)).toBe("/platform/connect");
      expect(
        new Intl.NumberFormat(
          localeMetadata[locale].intlLocale,
        ).resolvedOptions().locale,
      ).toBeTruthy();
      expect(openGraphLocale(locale)).toBe(
        localeMetadata[locale].openGraphLocale,
      );
    },
  );

  test("recognizes only the configured Simplified Chinese route", () => {
    expect(isLocale("zh-CN")).toBe(true);
    expect(isLocale("zh")).toBe(false);
    expect(isLocale("zh-TW")).toBe(false);
    expect(localeFromPathname("/fragrance")).toBe("en");
  });

  test.each([...publishedLocales])(
    "keeps %s for verification and reset emails",
    (locale) => {
      for (const parameter of ["callbackURL", "redirectTo"]) {
        const callback = localizePath("/reset-password", locale);
        const link = `https://ecentic.ai/api/auth/reset-password/token?${parameter}=${encodeURIComponent(callback)}`;
        expect(localeFromAuthLink(link)).toBe(locale);
      }
    },
  );

  test("uses a validated request locale when no callback identifies one", () => {
    expect(
      localeFromAuthLink(
        "https://ecentic.ai/api/auth/verify-email",
        new Headers({ "x-next-intl-locale": "fr" }),
      ),
    ).toBe("fr");
    expect(
      localeFromAuthLink(
        "https://ecentic.ai/api/auth/verify-email",
        new Headers({ "x-next-intl-locale": "unsupported" }),
      ),
    ).toBe("en");
  });

  test("unpublished catalog locales cannot enter authentication or routing", () => {
    expect(isLocale("ja")).toBe(true);
    expect(isPublishedLocale("ja")).toBe(false);
    expect(
      localeFromAuthLink(
        "https://ecentic.ai/api/auth/verify-email",
        new Headers({ "x-next-intl-locale": "ja" }),
      ),
    ).toBe("en");
  });
});
