import {
  ArrowRightIcon,
  AwardIcon,
  BellIcon,
  CheckIcon,
  CircleBoltIcon,
  CodeIcon,
  ShieldCheckIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { getMessages, getTranslations } from "next-intl/server";
import { BookCall } from "@/components/cal";
import { Plus } from "@/components/plus";

const capabilityIcons = [
  SquareChartIcon,
  CodeIcon,
  ShieldCheckIcon,
  AwardIcon,
  CircleBoltIcon,
  BellIcon,
] as const;

export const Capabilities = async () => {
  const translate = await getTranslations("enterprise");
  const messages = await getMessages();
  const items = messages.enterprise.capabilities.items;
  const scopingSteps = messages.enterprise.capabilities.scoping.steps;

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
            const IconComponent = capabilityIcons[index] ?? SquareChartIcon;

            return (
              <div
                key={capability.title}
                className={cn(
                  "flex flex-col p-6 md:min-h-96 md:p-8",
                  "highlighted" in capability && capability.highlighted
                    ? "bg-primary text-white"
                    : "bg-background-rich text-foreground",
                )}
              >
                <IconComponent
                  className={cn(
                    "size-8",
                    "highlighted" in capability && capability.highlighted
                      ? "text-white"
                      : "text-primary",
                  )}
                />
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

        <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[8fr_5fr]">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
          <div className="flex flex-col justify-between gap-8 bg-primary p-6 text-white md:p-10">
            <div className="flex flex-col gap-4">
              <span className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 font-medium text-sm">
                {translate("capabilities.cta.badge")}
              </span>
              <h3 className="max-w-lg font-body font-medium text-3xl leading-tight md:text-4xl">
                {translate("capabilities.cta.title")}
              </h3>
              <p className="max-w-lg font-light text-lg text-white">
                {translate("capabilities.cta.description")}
              </p>
            </div>
            <BookCall color="accent" className="w-full sm:w-fit">
              {translate("capabilities.cta.action.primary")}
              <ArrowRightIcon className="size-4" />
            </BookCall>
          </div>
          <div className="flex flex-col gap-px bg-accent-foreground">
            <p className="bg-background-dimmed px-6 pt-6 pb-4 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em] md:px-8">
              {translate("capabilities.scoping.label")}
            </p>
            {scopingSteps.map((stage) => (
              <div
                key={stage.step}
                className="flex flex-1 items-start gap-4 bg-background-dimmed px-6 py-5 md:px-8"
              >
                <span className="font-normal text-primary text-xl">
                  {stage.step}
                </span>
                <div className="flex flex-col gap-1">
                  <h4 className="font-body font-medium text-foreground text-xl">
                    {stage.title}
                  </h4>
                  <p className="font-light text-foreground-dimmed">
                    {stage.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
