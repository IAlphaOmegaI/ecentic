import { ArrowRightIcon, FileIcon, SquareChartIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "@/components/plus";
import shopify from "@/public/images/shopify.svg";
import woocommerce from "@/public/images/woocommerce.svg";

const nextSteps = [
  {
    href: "/platforms/shopify",
    logo: shopify,
    name: "Shopify",
    title: "See the workflow for Shopify catalogs",
    description:
      "Connect products, benchmark competitors, and publish approved listing updates back into Shopify.",
    label: "Open Shopify page",
    color: "primary",
  },
  {
    href: "/platforms/woocommerce",
    logo: woocommerce,
    name: "WooCommerce",
    title: "Run the same loop for WooCommerce products",
    description:
      "Use the WooCommerce path if your team needs product improvements without changing platforms.",
    label: "Open WooCommerce page",
    color: "accent",
  },
  {
    href: "/compare/best-ai-ecommerce-tools",
    icon: SquareChartIcon,
    name: "Comparison",
    title: "Compare AI ecommerce categories before you buy",
    description:
      "Use the guide to separate content generators from agent-commerce optimization tools.",
    label: "Read comparison guide",
    color: "accent",
  },
  {
    href: "/blog",
    icon: FileIcon,
    name: "Blog",
    title: "Go deeper on structured data, AI traffic, and catalog visibility",
    description:
      "The blog turns product listing optimization into repeatable operational checklists for merchants and teams.",
    label: "Visit the blog",
    color: "accent",
  },
] as const;

export const NextSteps = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">04</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          Where to go after this page.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          Move from the listing workflow into the platform or research content
          that fits your next step.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-2">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 sm:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 sm:flex" />
        {nextSteps.map((nextStep) => (
          <article
            key={nextStep.href}
            className="flex h-full flex-col gap-4 bg-background-rich p-6 md:p-8"
          >
            {"logo" in nextStep ? (
              <Image
                src={nextStep.logo}
                alt={nextStep.name}
                className="size-7"
              />
            ) : (
              <nextStep.icon
                aria-label={nextStep.name}
                className="size-7 text-primary"
              />
            )}
            <div className="flex flex-1 flex-col gap-3">
              <h3 className="font-body font-medium text-2xl text-foreground leading-tight">
                {nextStep.title}
              </h3>
              <p className="font-light text-foreground-dimmed leading-relaxed">
                {nextStep.description}
              </p>
            </div>
            <Button
              color={nextStep.color}
              className="w-fit"
              render={<Link href={nextStep.href} />}
            >
              {nextStep.label}
              <ArrowRightIcon className="size-4" />
            </Button>
          </article>
        ))}
      </div>
    </div>
  </section>
);
