import type { Icon } from "@zenncore/icons";
import {
  BullseyeIcon,
  FileIcon,
  ShieldCheckIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { Plus } from "@/components/plus";

type Layer = {
  icon: Icon;
  layer: string;
  title: string;
  description: string;
};

const layers: readonly Layer[] = [
  {
    icon: BullseyeIcon,
    layer: "Layer 01",
    title: "Product identity",
    description:
      "The title carries useful buying context without clutter: product type, differentiator, and the variant or compatibility detail that matters.",
  },
  {
    icon: FileIcon,
    layer: "Layer 02",
    title: "Product explanation",
    description:
      "The description makes comparison easier by explaining what matters most, how the product fits the use case, and what would otherwise create doubt.",
  },
  {
    icon: SquareChartIcon,
    layer: "Layer 03",
    title: "Attribute completeness",
    description:
      "Missing dimensions, materials, compatibility fields, warranty details, or pack counts quietly weaken a product in competitive categories.",
  },
  {
    icon: ShieldCheckIcon,
    layer: "Layer 04",
    title: "Merchant trust",
    description:
      "Policy links, review coverage, availability accuracy, and clear support context reinforce the offer around the product itself.",
  },
] as const;

export const Layers = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">02</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          Four layers, improved together.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          Rewriting descriptions is only one slice of the work. High-performing
          listing optimization connects copy, data quality, and trust in the
          same pass.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2 lg:grid-cols-4">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        {layers.map((layer) => (
          <div
            key={layer.title}
            className="flex flex-col gap-2 bg-background-dimmed p-6 md:min-h-80 md:justify-end md:p-8"
          >
            <p className="font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em]">
              {layer.layer}
            </p>
            <layer.icon className="mt-2 size-12 text-primary" />
            <h3 className="font-body font-medium text-2xl text-foreground">
              {layer.title}
            </h3>
            <p className="font-body font-light text-foreground-dimmed">
              {layer.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
