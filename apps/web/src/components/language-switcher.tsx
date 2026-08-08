"use client";

import { cn } from "@zenncore/utils";
import { useLocale, useTranslations } from "next-intl";
import { SpainFlag } from "@/components/flags/spain-flag";
import { UnitedStatesFlag } from "@/components/flags/united-states-flag";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const OPTIONS = [
  {
    locale: "en" as const,
    Flag: UnitedStatesFlag,
    labelKey: "english" as const,
  },
  {
    locale: "es" as const,
    Flag: SpainFlag,
    labelKey: "spanish" as const,
  },
] as const;

export const LanguageSwitcher = ({
  variant = "floating",
  className,
}: LanguageSwitcher.Props = {}) => {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const translate = useTranslations("Common");

  const switchLocale = (next: Locale) => {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  };

  const control = (
    <fieldset
      className={cn("m-0 flex items-center gap-2 border-0 p-0", className)}
    >
      <legend className="sr-only">{translate("language")}</legend>
      {OPTIONS.map(({ locale: option, Flag, labelKey }) => {
        const active = option === locale;

        return (
          <button
            key={option}
            type="button"
            onClick={() => switchLocale(option)}
            aria-label={translate(labelKey)}
            aria-pressed={active}
            className={cn(
              "cursor-pointer rounded-sm p-0.5 transition-[opacity,transform] duration-150 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              "active:scale-[0.96]",
              active ? "opacity-100" : "opacity-40 hover:opacity-80",
            )}
          >
            <Flag className="size-7" title={translate(labelKey)} />
          </button>
        );
      })}
    </fieldset>
  );

  if (variant === "inline") return control;

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
      <div className="pointer-events-auto">{control}</div>
    </div>
  );
};

export namespace LanguageSwitcher {
  export type Props = {
    variant?: "floating" | "inline";
    className?: string;
  };
}
