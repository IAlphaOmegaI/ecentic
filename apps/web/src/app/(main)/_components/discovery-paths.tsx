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
  },
  {
    href: "/platforms/shopify",
    eyebrow: "Shopify",
    title: "AI for Shopify stores that need more than basic copy generation",
    description:
      "Connect your catalog, benchmark against competitors, and publish approved product listing updates back to Shopify.",
    label: "See Shopify workflow",
  },
  {
    href: "/compare/best-ai-ecommerce-tools",
    eyebrow: "Comparison",
    title: "Best AI tools for ecommerce in 2026",
    description:
      "Use the comparison guide to understand when you need content generation, personalization, analytics, or agent-commerce optimization.",
    label: "Read comparison guide",
  },
] as const;

export const DiscoveryPaths = () => (
  <section className="bg-background-dimmed/60">
    <div className="mx-auto max-w-6xl bg-background">
      <div className="grid gap-6 p-8 border-accent-foreground border-b pb-8 md:grid-cols-[3fr_5fr]">
        <div>
          <p className="font-medium text-primary text-sm uppercase tracking-[0.2em]">
            Next paths
          </p>
          <h2 className="mt-3 max-w-md text-4xl text-foreground leading-tight">
            Start with the pages built around the SEO strategy priorities
          </h2>
        </div>
        <p className="max-w-3xl text-foreground-dimmed leading-relaxed">
          The strategy centers on buyer-intent pages, internal links, and clear
          commercial paths. This section turns the homepage into a stronger hub
          for crawlers and merchants by linking directly to the highest-priority
          content clusters we are building first.
        </p>
      </div>

      <ContentPageCardGrid items={pages} />
    </div>
  </section>
);
