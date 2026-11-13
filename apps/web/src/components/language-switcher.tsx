"use client";

import { ChevronDownIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
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
import { localeMetadata, publishedLocales } from "@/i18n/locales";
import { getPathname, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const OPTIONS = publishedLocales.map((locale) => ({
  locale,
  ...localeMetadata[locale],
}));

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
  const translate = useTranslations("general");

  const switchLocale = (next: string | null) => {
    if (!next || next === locale) return;
    if (!hasLocale(routing.locales, next)) return;
    // Let locale middleware update its cookie before following the canonical
    // route. A document navigation also preserves the fragment when the
    // default locale redirects from /en/... to its unprefixed URL.
    window.location.assign(
      getPathname({
        href: `${pathname}${window.location.search}${window.location.hash}`,
        locale: next,
        forcePrefix: true,
      }),
    );
  };

  const active = localeMetadata[locale];

  if (variant === "inline") {
    return (
      <fieldset
        className={cn(
          "m-0 flex flex-wrap items-center gap-2 border-0 p-0",
          className,
        )}
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
        render={
          variant === "mobile"
            ? (props) => (
                <Button
                  {...props}
                  variant="soft"
                  color="emphasis"
                  className={cn("w-full", className)}
                />
              )
            : undefined
        }
        // The mobile render uses Button's native classes; desktop stays transparent.
        classList={{ icon: { root: "hidden" } }}
        className={cn(
          "h-10 min-w-0 gap-2 border-0 bg-transparent px-2 shadow-none",
          "hover:bg-transparent focus-visible:border-0 active:bg-transparent",
          "data-popup-open:border-0 data-popup-open:bg-transparent",
          className,
        )}
      >
        <FlagImage
          src={active.flagSrc}
          alt={translate(active.labelKey)}
          className={cn("shrink-0", variant === "mobile" ? "size-5" : "size-4")}
        />
        <SelectValue
          className={cn(
            "font-medium",
            variant === "mobile" ? "text-base" : "text-sm",
          )}
        >
          {() => active.shortLabel}
        </SelectValue>
        <ChevronDownIcon aria-hidden className="size-4 scale-75 opacity-70" />
      </SelectTrigger>
      <SelectPositioner
        align="end"
        side="bottom"
        className={variant === "mobile" ? "z-70" : undefined}
      >
        <SelectPopup>
          {OPTIONS.map(({ locale: option, flagSrc, labelKey, nativeName }) => (
            <SelectItem key={option} value={option} label={translate(labelKey)}>
              <span className="flex items-center gap-2">
                <FlagImage
                  src={flagSrc}
                  alt={translate(labelKey)}
                  className="size-5 shrink-0"
                />
                <span lang={option}>{nativeName}</span>
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
    variant?: "nav" | "mobile" | "inline";
    className?: string;
  };
}
