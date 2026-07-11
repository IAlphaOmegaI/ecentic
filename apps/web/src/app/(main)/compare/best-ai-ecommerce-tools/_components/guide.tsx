import { SquareChartIcon } from "@zenncore/icons";
import { Plus } from "@/components/plus";

const categories = [
  {
    title: "Content generation",
    description: "Product descriptions and catalog content at scale.",
  },
  {
    title: "Platform-native AI",
    description:
      "Built-in assistance for merchants staying close to their stack.",
  },
  {
    title: "Personalization & merchandising",
    description: "Onsite experiences, segmentation, and conversion.",
  },
  {
    title: "Search & discovery",
    description: "Product relevance and navigation infrastructure.",
  },
  {
    title: "Agent-commerce optimization",
    description: "AI shopping visibility and product selection.",
  },
] as const;

export const Guide = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">01</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          How to use this guide.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          Comparing categories first makes the final vendor decision faster and
          less likely to end up on the wrong shortlist.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        <div className="flex flex-col gap-6 bg-background-dimmed p-6 md:p-8">
          <SquareChartIcon className="size-8 text-primary" />
          <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
            A merchant choosing between a content generator, a personalization
            platform, a search product, and an agent-commerce workflow can
            easily end up with the wrong shortlist if everything is forced into
            one generic feature table.
          </p>
          <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
            The better question is: what job are you hiring the tool to do right
            now? Producing content faster, personalizing the storefront, and
            winning AI-mediated product selection are three different jobs with
            three different shortlists.
          </p>
        </div>
        <div className="flex flex-col gap-px bg-accent-foreground">
          <p className="bg-background-rich px-6 pt-6 pb-4 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em] md:px-8">
            The five categories in this guide
          </p>
          {categories.map((category) => (
            <div
              key={category.title}
              className="flex flex-1 flex-col gap-1 bg-background-rich px-6 py-4 md:px-8"
            >
              <h3 className="font-body font-medium text-foreground text-xl">
                {category.title}
              </h3>
              <p className="font-light text-foreground-dimmed leading-relaxed">
                {category.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
