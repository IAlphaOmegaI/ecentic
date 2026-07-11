import { cn } from "@zenncore/utils";
import { Plus } from "@/components/plus";

export const tools = [
  {
    name: "ecentic",
    category: "Agent-commerce optimization",
    summary:
      "Best for merchants who need simulation, competitor diagnosis, and listing optimization tied to AI shopping selection.",
    highlighted: true,
  },
  {
    name: "Hypotenuse AI",
    category: "Product content generation",
    summary:
      "Best for teams focused on producing product descriptions and marketplace content faster across large catalogs.",
    highlighted: false,
  },
  {
    name: "Shopify Magic",
    category: "Platform-native drafting",
    summary:
      "Best for Shopify merchants who want native AI assistance inside their existing store workflow.",
    highlighted: false,
  },
  {
    name: "Nosto",
    category: "Personalization",
    summary:
      "Best for brands prioritizing onsite personalization, segmentation, and merchandising experiences.",
    highlighted: false,
  },
  {
    name: "Constructor",
    category: "Search and discovery",
    summary:
      "Best for teams that need stronger ecommerce search relevance and product discovery infrastructure.",
    highlighted: false,
  },
  {
    name: "Bloomreach",
    category: "Enterprise intelligence",
    summary:
      "Best for enterprise teams combining search, merchandising, marketing, and customer data workflows.",
    highlighted: false,
  },
] as const;

export const Tools = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">02</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          The tools most merchants compare.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          Each one leads a different category. The best shortlist usually starts
          with one tool per category, not six tools from the same one.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2 lg:grid-cols-3">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 lg:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 lg:flex" />
        {tools.map((tool, index) => (
          <article
            key={tool.name}
            className={cn(
              "flex flex-col gap-2 p-6 md:p-8",
              tool.highlighted
                ? "bg-primary text-white"
                : "bg-background-rich text-foreground",
            )}
          >
            <div className="flex items-baseline justify-between gap-4">
              <span
                className={cn(
                  "font-normal text-xl",
                  tool.highlighted ? "text-white/80" : "text-primary",
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <p
                className={cn(
                  "font-medium text-sm uppercase tracking-[0.18em]",
                  tool.highlighted ? "text-white/70" : "text-foreground-dimmed",
                )}
              >
                {tool.category}
              </p>
            </div>
            <h3 className="mt-2 font-body font-medium text-2xl">{tool.name}</h3>
            <p
              className={cn(
                "font-body font-light",
                tool.highlighted ? "text-white/80" : "text-foreground-dimmed",
              )}
            >
              {tool.summary}
            </p>
          </article>
        ))}
      </div>
    </div>
  </section>
);
