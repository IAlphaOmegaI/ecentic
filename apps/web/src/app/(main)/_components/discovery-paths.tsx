import { ContentPageCardGrid } from "./content";

const pages = [
  {
    href: "/features",
    eyebrow: "Features",
    title: "AI ecommerce tools for product visibility and conversion",
    description:
      "Explore the workflows merchants use to simulate AI shopping decisions, diagnose losses, and prioritize listing improvements.",
    label: "Explore features",
    color: "primary",
    variant: "flat",
  },
  {
    href: "/features/product-listings",
    eyebrow: "Product listings",
    title: "AI product listing optimization for titles, descriptions, and data",
    description:
      "See how clearer product content, stronger attributes, and faster approvals improve comparison quality across AI shopping systems.",
    label: "View listing page",
    color: "primary",
    variant: "flat",
  },
  {
    href: "/platforms/shopify",
    eyebrow: "Shopify",
    title: "AI for Shopify stores that need more than basic copy generation",
    description:
      "Connect your catalog, benchmark against competitors, and publish approved product listing updates back to Shopify.",
    label: "See Shopify workflow",
    color: "primary",
    variant: "flat",
  },
  {
    href: "/compare/best-ai-ecommerce-tools",
    eyebrow: "Comparison",
    title: "Best AI tools for ecommerce in 2026",
    description:
      "Use the comparison guide to understand when you need content generation, personalization, analytics, or agent-commerce optimization.",
    label: "Read comparison guide",
    color: "primary",
    variant: "flat",
  },
  {
    href: "/enterprise",
    eyebrow: "Enterprise",
    title: "Multi-brand agent intelligence for enterprise merchants",
    description:
      "API access, SSO, SOC 2, UCP signing, and a dedicated CSM — for the teams running hundreds of SKUs across platforms.",
    label: "See enterprise plan",
    color: "primary",
    variant: "flat",
  },
] as const;

export const DiscoveryPaths = () => (
  <section className="border-accent-foreground border-y">
    <div className="mx-auto max-w-6xl">
      <h2 className="border-accent-foreground border-b p-8 font-body text-3xl text-foreground md:text-5xl">
        Find the page that matches your buying stage
      </h2>

      <div className="grid gap-px bg-accent-foreground border-accent-foreground md:grid-cols-2">
        {pages.map((page) => (
          <Card key={page.href} {...page} />
        ))}
      </div>
    </div>
  </section>
);

import {
  ArrowRightIcon,
  BarChartIcon,
  GaugeIcon,
  RocketIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import type { ComponentType } from "react";

const icons: Record<string, ComponentType<{ className?: string }>> = {
  "/features": BarChartIcon,
  "/features/product-listings": ShoppingCartIcon,
  "/platforms/shopify": RocketIcon,
  "/compare/best-ai-ecommerce-tools": GaugeIcon,
  "/enterprise": ShieldCheckIcon,
};

const Card = ({ href, title, description, label }: (typeof pages)[number]) => {
  const Icon = icons[href];
  return (
    <article className="relative flex flex-col pt-24 gap-2 bg-background-dimmed p-4">
      {Icon && <Icon className="size-16 text-primary" />}

      <h3 className="font-body font-medium text-2xl text-foreground md:text-4xl">
        {title}
      </h3>
      <p className="font-body font-light text-foreground-dimmed text-lg mt-auto">
        {description}
      </p>
      <Button variant="flat" color="primary" render={<Link href={href} />}>
        {label}
        <ArrowRightIcon className="size-4" />
      </Button>
    </article>
  );
};
