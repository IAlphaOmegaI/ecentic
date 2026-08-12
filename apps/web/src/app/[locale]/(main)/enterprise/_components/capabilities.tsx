import {
  AwardIcon,
  BellIcon,
  CircleBoltIcon,
  CodeIcon,
  ShieldCheckIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { getMessages, getTranslations } from "next-intl/server";
import { ItemCycle } from "@/app/[locale]/(main)/_components/item-cycle";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";

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
  const scoping = messages.enterprise.capabilities.scoping;

  return (
    <section className="scroll-mt-24 border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <Reveal className="p-6 md:p-12">
          <RevealItem>
            <span className="font-normal text-3xl text-primary">
              {translate("capabilities.number")}
            </span>
          </RevealItem>
          <RevealItem>
            <h2 className="mt-2 max-w-4xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
              {translate("capabilities.title")}
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
              {translate("capabilities.description")}
            </p>
          </RevealItem>
        </Reveal>

        <Reveal
          stagger={0.08}
          className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2"
        >
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
          {items.map((capability, index) => {
            const IconComponent = capabilityIcons[index] ?? SquareChartIcon;

            return (
              <RevealItem
                key={capability.title}
                className="flex flex-col gap-4 bg-background-dimmed p-6 md:min-h-72 md:p-8"
              >
                <div className="flex items-center justify-between">
                  <span className="font-normal text-lg text-primary-text tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <IconComponent className="size-8 text-primary" />
                </div>
                <h3 className="font-body font-medium text-2xl text-foreground md:text-3xl">
                  {capability.title}
                </h3>
                <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
                  {capability.description}
                </p>
              </RevealItem>
            );
          })}
        </Reveal>

        <Reveal className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

          <div className="flex flex-col bg-background-dimmed md:min-h-0">
            <RevealItem className="flex flex-col gap-4 p-6 md:p-8">
              <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
                {translate("capabilities.paragraph")}
              </p>
            </RevealItem>
            <ItemCycle items={scoping} />
          </div>

          <div className="flex min-h-0 flex-col gap-px bg-accent-foreground md:h-full">
            <h3 className="shrink-0 bg-background-rich px-6 pt-6 pb-4 font-body font-medium text-3xl text-foreground md:px-8">
              {translate("capabilities.panelTitle")}
            </h3>
            {scoping.map((stage, index) => (
              <div
                key={stage.title}
                className="grid min-h-0 flex-1 grid-cols-[2.5rem_1fr] content-start bg-background-rich px-6 py-5 md:grid-cols-[5rem_1fr] md:px-8"
              >
                <span className="font-normal text-lg text-primary-text tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <RevealItem className="flex flex-col gap-1">
                  <h4 className="font-body font-medium text-foreground text-xl">
                    {stage.title}
                  </h4>
                  <p className="font-light text-foreground-dimmed leading-relaxed">
                    {stage.description}
                  </p>
                </RevealItem>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
};
