import {
  CommerceBasketShoppingIcon,
  CommerceCode_3Icon,
  CommerceGlobePointerIcon,
} from "@zenncore/icons";
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
    <div className="grid min-w-0 grid-cols-3 gap-3" aria-hidden>
      {sources.map(({ key, icon: Icon, fields }, index) => (
        <div
          key={key}
          className="relative min-w-0 border border-accent-foreground bg-background-dimmed px-3 py-5"
        >
          <Icon className="mb-5 size-8 text-primary" />
          <p className="mb-4 font-medium text-sm leading-tight">{copy[key]}</p>
          <div className="grid gap-3 border-accent-foreground border-t pt-4">
            {fields.map((field, position) => (
              <div key={field} className="min-w-0">
                <span className="block truncate font-mono text-[10px] text-primary-text">
                  {field}
                </span>
                <span
                  className={`mt-2 block h-1 bg-foreground-dimmed/20 ${position === index ? "w-1/3" : "w-4/5"}`}
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
