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
  <section className="relative -left-[calc(50vw-50%)] w-screen border border-accent-foreground p-2">
    <div className="flex flex-col items-center justify-center  rounded-xl bg-background-rich md:py-20 py-4">
      <div className="size-full border-accent-foreground border-t gap-6 px-4 md:gap-8 md:px-20">
        <div className="mx-auto max-w-6xl">
          <div className=" border-accent-foreground">
            <h2 className="text-center font-body text-3xl md:text-6xl border-x border-accent-foreground px-4 p-8">
              Find the page that matches your buying stage
            </h2>
          </div>

          <div className="-ml-[calc(50vw-50%)] px-[calc(50vw-50%)] w-screen border-accent-foreground border-y">
            <ContentPageCardGrid items={pages} />
          </div>
        </div>
      </div>
    </div>
  </section>
);
