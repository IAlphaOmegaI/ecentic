import { ArrowRightIcon, BarChartIcon, CircleBoltIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Plus } from "@/components/plus";
import shopify from "@/public/images/shopify.svg";
import woocommerce from "@/public/images/woocommerce.svg";

const internalLinks = [
  {
    href: "/features",
    icon: BarChartIcon,
    name: "Features",
    title: "Review the core AI ecommerce tools workflow",
    description:
      "Use the features page if you want the product-led overview before diving into a specific platform or comparison path.",
    label: "Open features page",
    color: "primary",
  },
  {
    href: "/features/product-listings",
    icon: CircleBoltIcon,
    name: "Product listings",
    title: "Go deeper on AI product listing optimization",
    description:
      "This page is the best next step if better product content and clearer attributes are the main priority.",
    label: "View listing workflow",
    color: "accent",
  },
  {
    href: "/platforms/shopify",
    logo: shopify,
    name: "Shopify",
    title: "See the Shopify-specific buying path",
    description:
      "Choose this page if your shortlist currently includes Shopify-native and Shopify-adjacent AI tools.",
    label: "Open Shopify page",
    color: "accent",
  },
  {
    href: "/platforms/woocommerce",
    logo: woocommerce,
    name: "WooCommerce",
    title: "See the WooCommerce-specific buying path",
    description:
      "Use the WooCommerce page if you need a truthful supported-platform path instead of a generic comparison only.",
    label: "Open WooCommerce page",
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
          Explore the pages behind the shortlist.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          Each page below goes deeper on a specific part of the decision:
          workflow, platform, or listing optimization.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-2">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 sm:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 sm:flex" />
        {internalLinks.map((entry) => (
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
