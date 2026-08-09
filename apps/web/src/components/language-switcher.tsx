"use client";

import { cn } from "@zenncore/utils";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@zenncore/web/components/select";
import Image from "next/image";
import { hasLocale, useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const OPTIONS = [
  {
    locale: "en" as const,
    flagSrc: "/images/united-states-flag.svg",
    labelKey: "language.english" as const,
  },
  {
    locale: "es" as const,
    flagSrc: "/images/spain-flag.svg",
    labelKey: "language.spanish" as const,
  },
] as const;

const FlagImage = ({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) => (
  <Image
    src={src}
    alt={alt}
    width={32}
    height={32}
    unoptimized
    className={className}
  />
);

export const LanguageSwitcher = ({
  variant = "nav",
  className,
}: LanguageSwitcher.Props = {}) => {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const translate = useTranslations("general");

  const switchLocale = (next: string | null) => {
    if (!next || next === locale) return;
    if (!hasLocale(routing.locales, next)) return;
    router.replace(pathname, { locale: next });
  };

  const active =
    OPTIONS.find((option) => option.locale === locale) ?? OPTIONS[0];

  if (variant === "inline") {
    return (
      <fieldset
        className={cn("m-0 flex items-center gap-2 border-0 p-0", className)}
      >
        <legend className="sr-only">{translate("language.label")}</legend>
        {OPTIONS.map(({ locale: option, flagSrc, labelKey }) => {
          const selected = option === locale;

          return (
            <button
              key={option}
              type="button"
              onClick={() => switchLocale(option)}
              aria-label={translate(labelKey)}
              aria-pressed={selected}
              className={cn(
                "cursor-pointer rounded-sm p-0.5 transition-[opacity,transform] duration-150 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                "active:scale-[0.96]",
                selected ? "opacity-100" : "opacity-40 hover:opacity-80",
              )}
            >
              <FlagImage
                src={flagSrc}
                alt={translate(labelKey)}
                className="size-7"
              />
            </button>
          );
        })}
      </fieldset>
    );
  }

  return (
    <Select value={locale} onValueChange={switchLocale}>
      <SelectTrigger
        aria-label={translate("language.label")}
        className={cn(
          "h-9 min-w-0 gap-1 border-0 bg-transparent px-1.5 pr-1 text-sm shadow-none",
          "hover:bg-transparent focus-visible:border-0 active:bg-transparent",
          "data-popup-open:border-0 data-popup-open:bg-transparent",
          className,
        )}
      >
        <FlagImage
          src={active.flagSrc}
          alt={translate(active.labelKey)}
          className="size-5 shrink-0"
        />
        <SelectValue className="sr-only" />
      </SelectTrigger>
      <SelectPositioner align="end" side="bottom">
        <SelectPopup>
          {OPTIONS.map(({ locale: option, flagSrc, labelKey }) => (
            <SelectItem key={option} value={option} label={translate(labelKey)}>
              <span className="flex items-center gap-2">
                <FlagImage
                  src={flagSrc}
                  alt={translate(labelKey)}
                  className="size-5 shrink-0"
                />
                <span>{translate(labelKey)}</span>
              </span>
            </SelectItem>
          ))}
        </SelectPopup>
      </SelectPositioner>
    </Select>
  );
};

export namespace LanguageSwitcher {
  export type Props = {
    variant?: "nav" | "inline";
    className?: string;
  };
}
