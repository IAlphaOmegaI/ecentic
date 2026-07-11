import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { Plus } from "@/components/plus";

export const workflows = [
  {
    href: "/features/product-listings",
    eyebrow: "Product listings",
    title: "Improve titles, descriptions, and structured product data",
    description:
      "Turn losing product pages into clearer buying inputs for AI shopping agents and high-intent shoppers.",
    label: "View listing workflow",
    color: "primary",
  },
  {
    href: "/platforms/shopify",
    eyebrow: "Shopify",
    title: "Connect a Shopify catalog and publish approved updates",
    description:
      "Benchmark products, review why agents prefer competitors, and send approved listing changes back to Shopify.",
    label: "See Shopify page",
    color: "accent",
  },
  {
    href: "/platforms/woocommerce",
    eyebrow: "WooCommerce",
    title: "Run the same optimization loop for WooCommerce stores",
    description:
      "Import product data, compare against competitors, and manage listing improvements without rebuilding your stack.",
    label: "See WooCommerce page",
    color: "accent",
  },
  {
    href: "/compare/best-ai-ecommerce-tools",
    eyebrow: "Comparison",
    title: "Understand where agent-commerce optimization fits",
    description:
      "Use the buyer's guide to compare content generators, personalization tools, analytics platforms, and agent-focused workflows.",
    label: "Read the guide",
    color: "accent",
  },
] as const;

export const Workflows = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">03</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          Pick the path that matches your stack.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          Each path targets a specific part of the optimization loop: listing
          quality, platform fit, or competitive research.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-2">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 sm:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 sm:flex" />
        {workflows.map((workflow) => (
          <article
            key={workflow.href}
            className="flex h-full flex-col gap-4 bg-background-rich p-6 md:p-8"
          >
            <p className="font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em]">
              {workflow.eyebrow}
            </p>
            <div className="flex flex-1 flex-col gap-3">
              <h3 className="font-body font-medium text-2xl text-foreground leading-tight">
                {workflow.title}
              </h3>
              <p className="font-light text-foreground-dimmed leading-relaxed">
                {workflow.description}
              </p>
            </div>
            <Button
              color={workflow.color}
              className="w-fit"
              render={<Link href={workflow.href} />}
            >
              {workflow.label}
              <ArrowRightIcon className="size-4" />
            </Button>
          </article>
        ))}
      </div>
    </div>
  </section>
);
