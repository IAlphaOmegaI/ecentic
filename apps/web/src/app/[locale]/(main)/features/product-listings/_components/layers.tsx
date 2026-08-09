import type { Icon } from "@zenncore/icons";
import {
  BullseyeIcon,
  FileIcon,
  ShieldCheckIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { getMessages, getTranslations } from "next-intl/server";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";

const layerIcons = [
  BullseyeIcon,
  FileIcon,
  SquareChartIcon,
  ShieldCheckIcon,
] as const;

export const Layers = async () => {
  const translate = await getTranslations("productListings");
  const messages = await getMessages();
  const items = messages.productListings.layers.items;
  const layers = items.map((item, index) => ({
    ...item,
    icon: layerIcons[index] as Icon,
  }));

  return (
    <section className="border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <Reveal className="p-6 md:p-12">
          <RevealItem>
            <span className="font-normal text-3xl text-primary">
              {translate("layers.number")}
            </span>
          </RevealItem>
          <RevealItem>
            <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
              {translate("layers.title")}
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
              {translate("layers.description")}
            </p>
          </RevealItem>
        </Reveal>

        <Reveal className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
          {layers.map((layer, index) => (
            <RevealItem
              key={layer.title}
              className="flex flex-col gap-4 bg-background-dimmed p-6 md:min-h-72 md:p-8"
            >
              <div className="flex items-center justify-between">
                <span className="font-normal text-lg text-primary tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <layer.icon className="size-8 text-primary" />
              </div>
              <h3 className="font-body font-medium text-2xl text-foreground md:text-3xl">
                {layer.title}
              </h3>
              <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
                {layer.description}
              </p>
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  );
};
