import {
  ArrowRightIcon,
  CircleBoltIcon,
  FileIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "@/components/plus";
import shopify from "@/public/images/shopify.svg";

const related = [
  {
    href: "/features/product-listings",
    icon: CircleBoltIcon,
    name: "Workflow",
    title: "Start with AI product listing optimization",
    description:
      "Review the listing workflow first if your team wants the category-level explanation before jumping into WooCommerce specifics.",
    label: "View listing workflow",
    color: "primary",
  },
  {
    href: "/platforms/shopify",
    logo: shopify,
    name: "Shopify",
    title: "Compare the Shopify path with the WooCommerce path",
    description:
      "Use the Shopify page if your team is evaluating platform fit or planning a multi-platform rollout.",
    label: "Open Shopify page",
    color: "accent",
  },
  {
    href: "/compare/best-ai-ecommerce-tools",
    icon: SquareChartIcon,
    name: "Comparison",
    title: "See how AI ecommerce categories fit different teams",
    description:
      "The guide helps buyers separate content generation, analytics, personalization, and agent-commerce optimization tools.",
    label: "Read comparison guide",
    color: "accent",
  },
  {
    href: "/blog",
    icon: FileIcon,
    name: "Blog",
    title: "Use the blog for the operational SEO and data layer",
    description:
      "Read the guides on structured data, AI shopping traffic, and catalog clarity to support the WooCommerce workflow.",
    label: "Visit the blog",
    color: "accent",
  },
] as const;

export const RelatedPages = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">05</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          Keep exploring the platform cluster.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          Continue into listing optimization, platform comparison, or blog
          content from here.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-2">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 sm:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 sm:flex" />
        {related.map((entry) => (
          <article
            key={entry.href}
            className="flex h-full flex-col gap-4 bg-background-rich p-6 md:p-8"
          >
            {"logo" in entry ? (
              <Image src={entry.logo} alt={entry.name} className="size-7" />
            ) : (
              <entry.icon
                aria-label={entry.name}
                className="size-7 text-primary"
              />
            )}
            <div className="flex flex-1 flex-col gap-3">
              <h3 className="font-body font-medium text-2xl text-foreground leading-tight">
                {entry.title}
              </h3>
              <p className="font-light text-foreground-dimmed leading-relaxed">
                {entry.description}
              </p>
            </div>
            <Button
              color={entry.color}
              className="w-fit"
              render={<Link href={entry.href} />}
            >
              {entry.label}
              <ArrowRightIcon className="size-4" />
            </Button>
          </article>
        ))}
      </div>
    </div>
  </section>
);
