import { FaceSearchIcon } from "@zenncore/icons";
import { Plus } from "@/components/plus";

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
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">01</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          Why WooCommerce merchants need a focused loop.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          WooCommerce operators usually need catalog-level insight, not just
          faster copy output.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        <div className="flex flex-col gap-6 bg-background-dimmed p-6 md:p-8">
          <FaceSearchIcon className="size-8 text-primary" />
          <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
            AI for WooCommerce stores is not only about faster content creation.
            WooCommerce catalogs change quickly, are managed by lean operators,
            and depend on clean product data to compete well.
          </p>
          <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
            That creates a practical need for a dedicated optimization loop.
            Merchants want to know which products are easiest to improve, which
            competitor keeps winning, and which listing details matter most
            before they spend time rewriting dozens of pages.
          </p>
        </div>
        <div className="flex flex-col gap-px bg-accent-foreground">
          <p className="bg-background-rich px-6 pt-6 pb-4 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em] md:px-8">
            Who this page is built for
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
