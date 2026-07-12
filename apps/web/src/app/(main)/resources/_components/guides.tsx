import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { Plus } from "@/components/plus";
import { GuideArt } from "./resource-art";

const guides = [
  {
    kind: "how-it-works" as const,
    eyebrow: "Product walkthrough",
    title: "How it works",
    description:
      "The simulate → diagnose → optimize loop, explained step by step for merchants who want to understand the product before they connect a store.",
    href: "/how-it-works",
    label: "See the loop",
    featured: true,
  },
  {
    kind: "compare" as const,
    eyebrow: "Buyer's guide",
    title: "Best AI tools for ecommerce",
    description:
      "A category-based comparison of agent-commerce, content, personalization, search, and analytics tools so you can shortlist vendors by job to be done.",
    href: "/compare/best-ai-ecommerce-tools",
    label: "Read the guide",
    featured: false,
  },
  {
    kind: "blog" as const,
    eyebrow: "Long-form",
    title: "Blog",
    description:
      "Guides on structured data, agent traffic, catalog visibility, and the protocols shaping AI shopping, written for merchants and operators.",
    href: "/blog",
    label: "Browse articles",
    featured: false,
  },
  {
    kind: "shopify" as const,
    eyebrow: "Platform guide",
    title: "Shopify",
    description:
      "Install from the App Store, import your catalog, and publish approved listing updates back into Shopify.",
    href: "/platforms/shopify",
    label: "Open Shopify guide",
    featured: false,
  },
  {
    kind: "woocommerce" as const,
    eyebrow: "Platform guide",
    title: "WooCommerce",
    description:
      "Connect with REST API keys, run the same simulation loop, and publish improvements without changing platforms.",
    href: "/platforms/woocommerce",
    label: "Open WooCommerce guide",
    featured: false,
  },
] as const;

export const Guides = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <h2 className="max-w-3xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
          Learn the system, then choose your depth.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          Begin with the product loop, compare the market, or go straight to
          platform-specific implementation.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        {guides.map((guide) => (
          <article
            key={guide.title}
            className={cn(
              "flex flex-col gap-5 bg-background-rich p-6 md:p-8",
              guide.featured &&
                "md:col-span-2 md:grid md:grid-cols-[5fr_8fr] md:items-center md:p-12",
            )}
          >
            <div
              className={cn(
                "flex min-h-24 items-center",
                guide.featured &&
                  "md:h-full md:min-h-48 md:border-accent-foreground md:border-r md:pr-8",
              )}
            >
              <GuideArt kind={guide.kind} />
            </div>
            <div className="flex flex-1 flex-col items-start gap-3">
              <p className="font-medium text-primary text-sm">
                {guide.eyebrow}
              </p>
              <h3 className="font-body font-medium text-2xl text-foreground">
                {guide.title}
              </h3>
              <p className="font-light text-foreground-dimmed leading-relaxed">
                {guide.description}
              </p>
              <Button
                color="primary"
                className="mt-auto"
                render={<Link href={guide.href} />}
              >
                {guide.label}
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);
