import { FaceSearchIcon } from "@zenncore/icons";
import { Plus } from "@/components/plus";

const audiences = [
  {
    title: "Evaluating the category",
    description:
      "Teams researching AI for Shopify stores and deciding what belongs in the stack.",
  },
  {
    title: "Complementing Shopify Magic",
    description:
      "Merchants looking for an alternative or complement to native content generation.",
  },
  {
    title: "Tying changes to outcomes",
    description:
      "Operators who want listing improvements tied to measurable competitive results.",
  },
  {
    title: "Closing the publishing loop",
    description:
      "Stores that need a tighter loop between catalog insight and what actually ships.",
  },
] as const;

export const Why = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">01</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          Why Shopify merchants outgrow native AI.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          Most Shopify merchants eventually hit a ceiling with native generation
          tools. This is what comes next.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        <div className="flex flex-col gap-6 bg-background-dimmed p-6 md:p-8">
          <FaceSearchIcon className="size-8 text-primary" />
          <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
            Most Shopify teams already have the basics: a storefront, a catalog,
            and a merchandising workflow. The real challenge is that product
            visibility now depends on more than theme design or ad performance.
            Titles, descriptions, attributes, and competitor context all shape
            whether a product feels easy to recommend.
          </p>
          <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
            The most useful AI workflow for Shopify stores goes beyond
            generation alone. Merchants need to know which products
            underperform, which competitor listing keeps winning, and which
            changes are worth shipping first.
          </p>
        </div>
        <div className="flex flex-col gap-px bg-accent-foreground">
          <p className="bg-background-rich px-6 pt-6 pb-4 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em] md:px-8">
            Who this decision point fits
          </p>
          {audiences.map((audience) => (
            <div
              key={audience.title}
              className="flex flex-1 flex-col gap-1 bg-background-rich px-6 py-5 md:px-8"
            >
              <h3 className="font-body font-medium text-foreground text-xl">
                {audience.title}
              </h3>
              <p className="font-light text-foreground-dimmed leading-relaxed">
                {audience.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
