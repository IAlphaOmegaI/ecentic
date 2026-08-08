"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

export const LanguageSwitcher = ({
  className,
}: LanguageSwitcher.Props = {}) => {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const translate = useTranslations("Common");

  return (
    <label className={className}>
      <span className="sr-only">{translate("language")}</span>
      <select
        value={locale}
        aria-label={translate("language")}
        onChange={(event) => {
          const next = event.target.value as Locale;
          router.replace(pathname, { locale: next });
        }}
        className="cursor-pointer border border-accent-foreground bg-background px-2 py-1 font-body text-foreground text-sm"
      >
        {routing.locales.map((option) => (
          <option key={option} value={option}>
            {option === "en" ? translate("english") : translate("spanish")}
          </option>
        ))}
      </select>
    </label>
  );
};

export namespace LanguageSwitcher {
  export type Props = {
    className?: string;
  };
}
