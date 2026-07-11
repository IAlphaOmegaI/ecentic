import { FaceSearchIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Plus } from "@/components/plus";

const mappings = [
  {
    category: "Content generation",
    improves: "Production speed for descriptions and catalog copy.",
    emphasized: false,
  },
  {
    category: "Personalization",
    improves: "Onsite relevance, segmentation, and conversion.",
    emphasized: false,
  },
  {
    category: "Search tools",
    improves: "Discovery and navigation inside your own store.",
    emphasized: false,
  },
  {
    category: "Analytics tools",
    improves: "Reporting visibility across the funnel.",
    emphasized: false,
  },
  {
    category: "Agent-commerce optimization",
    improves: "Product selection when AI systems compare competing listings.",
    emphasized: true,
  },
] as const;

export const Bottleneck = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">03</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          Match the category to your bottleneck.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          The most useful evaluation narrows to the specific operational
          bottleneck first, not to the longest feature checklist.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        <div className="flex flex-col gap-6 bg-background-dimmed p-6 md:p-8">
          <FaceSearchIcon className="size-8 text-primary" />
          <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
            A common mistake is to compare every AI ecommerce product as though
            it were a copy tool. That makes some evaluations look simpler, but
            it also hides the real buying decision.
          </p>
          <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
            Buyers usually get better results when they shortlist one tool per
            category first, then narrow the decision based on the bottleneck
            that matters most this quarter.
          </p>
        </div>
        <div className="flex flex-col gap-px bg-accent-foreground">
          <p className="bg-background-rich px-6 pt-6 pb-4 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em] md:px-8">
            What each category actually improves
          </p>
          {mappings.map((mapping) => (
            <div
              key={mapping.category}
              className="flex flex-1 flex-col gap-1 bg-background-rich px-6 py-4 md:px-8"
            >
              <h3
                className={cn(
                  "font-body font-medium text-xl",
                  mapping.emphasized ? "text-primary" : "text-foreground",
                )}
              >
                {mapping.category}
              </h3>
              <p className="font-light text-foreground-dimmed leading-relaxed">
                {mapping.improves}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
