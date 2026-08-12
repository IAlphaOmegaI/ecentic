import {
  BarChartIcon,
  BullseyeIcon,
  CheckBadgeIcon,
  CheckIcon,
  CircleBoltIcon,
  RadarIcon,
  TrendUpIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { getMessages, getTranslations } from "next-intl/server";
import { Plus } from "@/components/plus";

const capabilityIcons = [
  BarChartIcon,
  BullseyeIcon,
  CircleBoltIcon,
  TrendUpIcon,
  CheckBadgeIcon,
  RadarIcon,
] as const;

export const Capabilities = async () => {
  const translate = await getTranslations("features");
  const messages = await getMessages();
  const items = messages.features.capabilities.items;

  return (
    <section className="border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <div className="p-6 md:p-12">
          <span className="font-normal text-3xl text-primary">
            {translate("capabilities.number")}
          </span>
          <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
            {translate("capabilities.title")}
          </h2>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            {translate("capabilities.description")}
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2 lg:grid-cols-3">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 lg:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 lg:flex" />
          {items.map((capability, index) => {
            const IconComponent = capabilityIcons[index] ?? BarChartIcon;

            return (
              <div
                key={capability.title}
                className={cn(
                  "relative flex flex-col p-6 md:min-h-96 md:p-8",
                  "highlighted" in capability && capability.highlighted
                    ? "bg-primary text-white"
                    : "bg-background-rich text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center border",
                    "highlighted" in capability && capability.highlighted
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-accent-foreground bg-background text-primary",
                  )}
                >
                  <IconComponent className="size-5" />
                </span>
                <h3 className="mt-4 font-body font-medium text-2xl">
                  {capability.title}
                </h3>
                <p
                  className={cn(
                    "mt-2 font-body font-light text-lg",
                    "highlighted" in capability && capability.highlighted
                      ? "text-white"
                      : "text-foreground-dimmed",
                  )}
                >
                  {capability.description}
                </p>
                <div
                  className={cn(
                    "mt-6 flex flex-col gap-2.5 border-t pt-6 md:mt-auto",
                    "highlighted" in capability && capability.highlighted
                      ? "border-white/20"
                      : "border-accent-foreground",
                  )}
                >
                  {capability.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <CheckIcon
                        className={cn(
                          "mt-1 size-4 shrink-0",
                          "highlighted" in capability && capability.highlighted
                            ? "text-white/80"
                            : "text-primary",
                        )}
                      />
                      <p
                        className={cn(
                          "font-body font-light",
                          "highlighted" in capability && capability.highlighted
                            ? "text-white"
                            : "text-foreground-dimmed",
                        )}
                      >
                        {feature}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
