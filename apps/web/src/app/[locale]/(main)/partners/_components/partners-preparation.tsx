"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { Checkbox } from "@zenncore/web/components/checkbox";
import type { AppConfig } from "next-intl";
import { useState } from "react";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

export const PartnersPreparation = ({ copy }: PartnersPreparation.Props) => {
  const [ready, setReady] = useState<string[]>([]);

  return (
    <div className="relative grid gap-px bg-accent-foreground md:grid-cols-[1fr_2fr]">
      <Plus className="top-0 left-1/3 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
      <div className="flex min-w-0 flex-col bg-background px-4 py-10 sm:px-8 sm:py-12">
        <h2>{copy.title}</h2>
        <p className="mt-4 text-foreground-dimmed">{copy.description}</p>
        <p role="status" className="mt-8 font-medium text-lg text-primary-text">
          {copy.progress[ready.length]}
        </p>
      </div>
      <div className="min-w-0 bg-background">
        <fieldset>
          <legend className="sr-only">{copy.title}</legend>
          {copy.items.map((item, index) => (
            <label
              key={item.title}
              htmlFor={`partners-preparation-${index}`}
              className="group flex min-h-32 cursor-pointer items-start gap-4 border-accent-foreground border-b px-4 py-8 transition-colors duration-160 hover:bg-background-dimmed has-focus-visible:bg-background-dimmed sm:gap-6 sm:px-8"
            >
              <Checkbox
                id={`partners-preparation-${index}`}
                aria-label={item.title}
                checked={ready.includes(item.title)}
                onCheckedChange={(checked) =>
                  setReady((current) =>
                    checked
                      ? [...current, item.title]
                      : current.filter((entry) => entry !== item.title),
                  )
                }
                className="mt-1 shrink-0"
              />
              <span className="min-w-0">
                <span className="block font-medium text-foreground-rich text-xl leading-snug">
                  {item.title}
                </span>
                <span className="mt-2 block max-w-[58ch] text-foreground-dimmed">
                  {item.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap items-center gap-4 bg-background-dimmed px-4 py-6 sm:px-8">
          <Button render={<Link href="#application" />}>
            {copy.action.primary}
            <ArrowRightIcon className="size-4" />
          </Button>
          <p className="max-w-[36ch] text-foreground-dimmed text-sm">
            {copy.note}
          </p>
        </div>
      </div>
    </div>
  );
};

export namespace PartnersPreparation {
  export type Props = {
    copy: AppConfig["Messages"]["partnersPage"]["preparation"];
  };
}
