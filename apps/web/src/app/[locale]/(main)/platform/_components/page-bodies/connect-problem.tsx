import {
  CommerceBasketShoppingIcon,
  CommerceCode_3Icon,
  CommerceGlobePointerIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import type { AppConfig } from "next-intl";
import { CommerceFigure } from "@/components/marketing/commerce-figure";

const sources = [
  {
    key: "store",
    icon: CommerceBasketShoppingIcon,
    fields: ["title", "price", "description"],
  },
  {
    key: "merchant",
    icon: CommerceGlobePointerIcon,
    fields: ["title", "description", "price"],
  },
  {
    key: "feed",
    icon: CommerceCode_3Icon,
    fields: ["description", "title", "price"],
  },
] as const;

export const ConnectProblem = ({ copy }: ConnectProblem.Props) => (
  <figure className="relative m-0" data-connect-records>
    <CommerceFigure
      kind="drawer"
      className="mx-auto aspect-[5/3] max-w-xl bg-transparent!"
    />
    <div className="grid min-w-0 grid-cols-3 border-accent-foreground border-y">
      {sources.map(({ key, icon: Icon, fields }) => (
        <div
          key={key}
          className="min-w-0 border-accent-foreground border-r px-5 py-6 last:border-r-0 max-sm:px-3"
        >
          <Icon aria-hidden className="mb-4 size-6 text-primary-text" />
          <p className="min-h-12 font-medium text-sm leading-snug">
            {copy[key]}
          </p>
          <ul className="mt-5 grid gap-3 font-mono text-xs max-sm:text-xs">
            {fields.map((field, index) => (
              <li
                key={field}
                className={cn(
                  index === 0
                    ? "text-primary-text"
                    : index === 1
                      ? "text-secondary"
                      : "text-success-dimmed",
                )}
              >
                {field}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <figcaption className="px-8 py-6 text-foreground-dimmed text-sm max-sm:px-4">
      {copy.note}
    </figcaption>
  </figure>
);

export namespace ConnectProblem {
  export type Props = {
    copy: AppConfig["Messages"]["reviewConnect"]["problem"];
  };
}
