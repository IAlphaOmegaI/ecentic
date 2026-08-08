import { ItemCycle } from "@/app/(main)/_components/item-cycle";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";

const audiences = [
  {
    title: "Researching AI workflows",
    description:
      "WooCommerce operators evaluating what AI should actually do for product pages.",
  },
  {
    title: "Staying on WooCommerce",
    description:
      "Teams that want better product visibility without changing ecommerce platforms.",
  },
  {
    title: "Insight tied to updates",
    description:
      "Merchants who need competitor analysis connected directly to listing changes.",
  },
  {
    title: "Diagnosis to publishing",
    description:
      "Buyers checking whether a workflow can move from analysis all the way to the live store.",
  },
] as const;

export const Why = () => (
  <section className="scroll-mt-24 border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <Reveal className="p-6 md:p-12">
        <RevealItem>
          <span className="font-normal text-3xl text-primary">01</span>
        </RevealItem>
        <RevealItem>
          <h2 className="mt-2 max-w-4xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
            Why WooCommerce merchants need a focused loop.
          </h2>
        </RevealItem>
        <RevealItem>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            WooCommerce operators usually need catalog-level insight, not just
            faster copy output.
          </p>
        </RevealItem>
      </Reveal>

      <Reveal className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

        <div className="flex flex-col bg-background-dimmed md:min-h-0">
          <RevealItem className="flex flex-col gap-4 p-6 md:p-8">
            <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
              AI for WooCommerce stores is not only about faster content
              creation. WooCommerce catalogs change quickly, are managed by lean
              operators, and depend on clean product data to compete well.
            </p>
            <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
              That creates a practical need for a dedicated optimization loop.
              Merchants want to know which products are easiest to improve,
              which competitor keeps winning, and which listing details matter
              most before they spend time rewriting dozens of pages.
            </p>
          </RevealItem>
          <ItemCycle items={audiences} />
        </div>

        <div className="flex min-h-0 flex-col gap-px bg-accent-foreground md:h-full">
          <h3 className="shrink-0 bg-background-rich px-6 pt-6 pb-4 font-body font-medium text-3xl text-foreground md:px-8">
            Who this page is built for
          </h3>
          {audiences.map((audience, index) => (
            <div
              key={audience.title}
              className="grid min-h-0 flex-1 grid-cols-[2.5rem_1fr] content-start bg-background-rich px-6 py-5 md:grid-cols-[5rem_1fr] md:px-8"
            >
              <span className="font-normal text-lg text-primary tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <RevealItem className="flex flex-col gap-1">
                <h4 className="font-body font-medium text-foreground text-xl">
                  {audience.title}
                </h4>
                <p className="font-light text-foreground-dimmed leading-relaxed">
                  {audience.description}
                </p>
              </RevealItem>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  </section>
);
