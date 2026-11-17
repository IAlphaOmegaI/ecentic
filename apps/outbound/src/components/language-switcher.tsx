"use client";

import { ChevronDownIcon } from "@zenncore/icons";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@zenncore/web/components/select";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { isLocale } from "@/i18n/locales";
import { getPathname, usePathname } from "@/i18n/navigation";

const languages = [
  { locale: "en", name: "English", short: "EN", flag: "united-states" },
  { locale: "es", name: "Español", short: "ES", flag: "spain" },
  { locale: "fr", name: "Français", short: "FR", flag: "france" },
  { locale: "de", name: "Deutsch", short: "DE", flag: "germany" },
  { locale: "it", name: "Italiano", short: "IT", flag: "italy" },
  { locale: "ja", name: "日本語", short: "JA", flag: "japan" },
  { locale: "zh-CN", name: "简体中文", short: "中文", flag: "china" },
] as const;

export const LanguageSwitcher = () => {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("outbound.auth");
  const current =
    languages.find((language) => language.locale === locale) ?? languages[0];
  return (
    <Select
      value={locale}
      onValueChange={(value) => {
        if (!value || value === locale || !isLocale(value)) return;
        window.location.assign(
          getPathname({
            href: `${pathname}${window.location.search}${window.location.hash}`,
            locale: value,
            forcePrefix: true,
          }),
        );
      }}
    >
      <SelectTrigger
        aria-label={t("language")}
        classList={{ icon: { root: "hidden" } }}
        className="h-10 min-w-0 gap-2 border-0 bg-transparent px-2 shadow-none hover:bg-transparent focus-visible:border-0 active:bg-transparent data-popup-open:border-0 data-popup-open:bg-transparent"
      >
        <Image
          src={`/images/${current.flag}-flag.svg`}
          alt=""
          width={20}
          height={20}
          unoptimized
          className="size-4 shrink-0"
        />
        <SelectValue className="font-medium text-sm">
          {() => current.short}
        </SelectValue>
        <ChevronDownIcon aria-hidden className="size-4 scale-75 opacity-70" />
      </SelectTrigger>
      <SelectPositioner align="end">
        <SelectPopup>
          {languages.map((language) => (
            <SelectItem
              key={language.locale}
              value={language.locale}
              label={language.name}
            >
              <span className="flex items-center gap-2">
                <Image
                  src={`/images/${language.flag}-flag.svg`}
                  alt=""
                  width={20}
                  height={20}
                  unoptimized
                  className="size-5 shrink-0"
                />
                <span lang={language.locale}>{language.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectPopup>
      </SelectPositioner>
    </Select>
  );
};
