import {
  CommerceBasketShoppingIcon,
  CommerceCode_3Icon,
  CommerceGlobePointerIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import type { AppConfig } from "next-intl";

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
  <figure className="relative px-8 pb-10 max-sm:px-4">
    <div
      className="relative isolate grid min-w-0 grid-cols-3 items-start gap-3 py-5 max-sm:gap-2"
      aria-hidden
    >
      <div className="absolute inset-0 -z-1 bg-radial-[at_50%_60%] from-primary/10 via-transparent to-transparent" />
      {sources.map(({ key, icon: Icon, fields }, index) => (
        <div
          key={key}
          className={cn(
            "relative min-w-0 rounded-lg border border-accent-foreground bg-background-rich shadow-[0_12px_28px_-20px_var(--color-emphasis)]",
            index === 0
              ? "mt-5"
              : index === 1
                ? "border-primary/25 bg-linear-to-b from-primary/5 to-background-rich"
                : "mt-9",
          )}
        >
          <div className="px-4 pt-5 pb-4 max-sm:px-3">
            <Icon
              className={cn(
                "mb-4 size-8",
                index === 0
                  ? "text-primary-text"
                  : index === 1
                    ? "text-secondary"
                    : "text-success-dimmed",
              )}
            />
            <p className="min-h-10 font-heading text-base leading-tight max-sm:text-sm">
              {copy[key]}
            </p>
          </div>
          <div className="grid gap-5 border-accent-foreground border-t px-4 py-5 max-sm:px-3">
            {fields.map((field, position) => (
              <div key={field} className="min-w-0">
                <span
                  className={cn(
                    "block truncate font-mono text-xs max-sm:text-[10px]",
                    position === 0
                      ? "text-primary-text"
                      : position === 1
                        ? "text-secondary"
                        : "text-success-dimmed",
                  )}
                >
                  {field}
                </span>
                <span
                  className={cn(
                    "mt-3 block h-px bg-foreground-dimmed/35",
                    position === index ? "w-1/3" : "w-4/5",
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    <figcaption className="mt-5 text-foreground-dimmed text-sm">
      {copy.note}
    </figcaption>
  </figure>
);

export namespace ConnectProblem {
  export type Props = {
    copy: AppConfig["Messages"]["reviewConnect"]["problem"];
  };
}
