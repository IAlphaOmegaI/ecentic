import {
  BarChartIcon,
  CodeIcon,
  HammerIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { getTranslations } from "next-intl/server";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";

const featureKeys = [
  { key: "aiScore", icon: BarChartIcon, color: "text-blue-500" },
  { key: "competitors", icon: ShieldCheckIcon, color: "text-green-500" },
  { key: "fixes", icon: HammerIcon, color: "text-red-500" },
  { key: "track", icon: CodeIcon, color: "text-purple-500" },
  { key: "ucp", icon: ShoppingCartIcon, color: "text-warning" },
] as const;

export const Features = async () => {
  const translate = await getTranslations("home");

  return (
    <section
      id="features"
      className="relative -left-[calc(50vw-50%)] -z-1 w-screen scroll-mt-[5.5rem]"
    >
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-y">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div className="relative p-6 md:p-12">
          <h2 className="font-body font-medium text-3xl text-foreground md:text-5xl">
            {translate("features.title")}
          </h2>
        </div>
        <Reveal className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
          {featureKeys.map((feature, index) => (
            <RevealItem
              key={feature.key}
              className={cn(
                "relative flex flex-col justify-end gap-2 bg-background-dimmed p-4 md:h-82",
                // An odd card out spans the row instead of leaving a hole in
                // the two-column grid.
                index === featureKeys.length - 1 &&
                  featureKeys.length % 2 === 1 &&
                  "md:col-span-2",
              )}
            >
              {index === 0 && (
                <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
              )}
              {index === 0 && (
                <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:flex" />
              )}
              {index === 2 && (
                <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:flex" />
              )}
              <feature.icon className={cn(feature.color, "size-16")} />
              {/* h3, not h2: these four are the children of the section's own
                  heading, and a page whose headings are all siblings has no
                  outline for a reader — human or crawler — to walk. Tailwind's
                  preflight strips UA heading styles, so the level carries no
                  visual weight of its own and nothing here moves. */}
              <h3 className="font-body font-medium text-2xl text-foreground md:text-4xl">
                {translate(`features.items.${feature.key}.title`)}
              </h3>
              <p className="font-body font-light text-foreground-dimmed text-lg">
                {translate(`features.items.${feature.key}.description`)}
              </p>
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  );
};
