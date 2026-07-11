import type { Icon } from "@zenncore/icons";
import {
  ArrowRightIcon,
  BarChartIcon,
  CircleBoltIcon,
  FileIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { Plus } from "@/components/plus";

type Related = {
  href: string;
  icon: Icon;
  name: string;
  title: string;
  description: string;
  label: string;
  color: "primary" | "accent";
};

const related: readonly Related[] = [
  {
    href: "/features/product-listings",
    icon: CircleBoltIcon,
    name: "Workflow",
    title: "Start with AI product listing optimization",
    description:
      "See how the listing workflow improves titles, descriptions, and structured product context before you publish.",
    label: "View listing workflow",
    color: "primary",
  },
  {
    href: "/compare/best-ai-ecommerce-tools",
    icon: SquareChartIcon,
    name: "Comparison",
    title: "Compare AI ecommerce tool categories before you commit",
    description:
      "Use the guide to understand when Shopify-native generation is enough and when a broader optimization loop adds value.",
    label: "Read comparison guide",
    color: "accent",
  },
  {
    href: "/blog",
    icon: FileIcon,
    name: "Blog",
    title: "Read the supporting guides for AI traffic and structured data",
    description:
      "Use the blog for the operational details that reinforce your Shopify product page improvements over time.",
    label: "Visit the blog",
    color: "accent",
  },
  {
    href: "/features",
    icon: BarChartIcon,
    name: "Features",
    title: "Review the wider AI ecommerce tools stack",
    description:
      "Step back into the main features page if your team is evaluating the whole workflow rather than one platform.",
    label: "Open features page",
    color: "accent",
  },
] as const;

export const RelatedPages = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">04</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          Keep exploring the Shopify cluster.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          Continue into listing optimization, platform comparison, or blog
          content to build more context.
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
            <entry.icon
              aria-label={entry.name}
              className="size-7 text-primary"
            />
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
