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
import { hasLocale, useLocale, useTranslations } from "next-intl";
import { SpainFlag } from "@/components/flags/spain-flag";
import { UnitedStatesFlag } from "@/components/flags/united-states-flag";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const OPTIONS = [
  {
    locale: "en" as const,
    Flag: UnitedStatesFlag,
    labelKey: "language.english" as const,
  },
  {
    locale: "es" as const,
    Flag: SpainFlag,
    labelKey: "language.spanish" as const,
  },
] as const;

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
  const ActiveFlag = active.Flag;

  if (variant === "inline") {
    return (
      <fieldset
        className={cn("m-0 flex items-center gap-2 border-0 p-0", className)}
      >
        <legend className="sr-only">{translate("language.label")}</legend>
        {OPTIONS.map(({ locale: option, Flag, labelKey }) => {
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
              <Flag className="size-7" title={translate(labelKey)} />
            </button>
          );
        })}
      </fieldset>
    );
  }

  return (
    <Select
      value={locale}
      onValueChange={switchLocale}
    >
      <SelectTrigger
        aria-label={translate("language.label")}
        className={cn(
          "h-9 min-w-0 gap-1 border-0 bg-transparent px-1.5 pr-1 text-sm shadow-none",
          "hover:bg-transparent focus-visible:border-0 active:bg-transparent",
          "data-popup-open:border-0 data-popup-open:bg-transparent",
          className,
        )}
      >
        <ActiveFlag
          className="size-5 shrink-0"
          title={translate(active.labelKey)}
        />
        <SelectValue className="sr-only" />
      </SelectTrigger>
      <SelectPositioner align="end" side="bottom">
        <SelectPopup>
          {OPTIONS.map(({ locale: option, Flag, labelKey }) => (
            <SelectItem key={option} value={option} label={translate(labelKey)}>
              <span className="flex items-center gap-2">
                <Flag className="size-5 shrink-0" title={translate(labelKey)} />
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
