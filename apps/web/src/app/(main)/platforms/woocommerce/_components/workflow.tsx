import { ItemCycle } from "@/app/(main)/_components/item-cycle";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";
import { WooWorkflowCycle } from "./woo-workflow-cycle";

const advantages = [
  {
    title: "Uneven catalog data",
    description:
      "Product data spread across a large catalog with uneven consistency.",
  },
  {
    title: "Diagnosis to publishing",
    description: "A faster path from competitive diagnosis to live updates.",
  },
  {
    title: "Spec-led competition",
    description:
      "Competitors winning through clearer specifications and offer context.",
  },
  {
    title: "Weekly repeatability",
    description:
      "A system operators can run every week, not a one-time rewrite project.",
  },
] as const;

export const Workflow = () => (
  <section className="scroll-mt-24 border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <Reveal className="p-6 md:p-12">
        <RevealItem>
          <span className="font-normal text-3xl text-primary">02</span>
        </RevealItem>
        <RevealItem>
          <h2 className="mt-2 max-w-4xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
            The WooCommerce workflow in ecentic.
          </h2>
        </RevealItem>
        <RevealItem>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            The workflow connects product data to competitor analysis, then to a
            publishing path back inside WooCommerce instead of another manual
            content handoff.
          </p>
        </RevealItem>
      </Reveal>

      <Reveal className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

        <div className="flex flex-col bg-background-dimmed md:min-h-0">
          <RevealItem className="flex flex-col gap-4 p-6 md:p-8">
            <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
              Install the plugin, import the catalog, benchmark the products
              that matter, then approve REST publish-backs — without leaving
              WooCommerce or rewriting the whole storefront.
            </p>
          </RevealItem>
          <ItemCycle items={advantages} />
        </div>

        <div className="flex min-h-0 flex-col gap-px bg-accent-foreground md:h-full">
          <h3 className="shrink-0 bg-background-rich px-6 pt-6 pb-4 font-body font-medium text-3xl text-foreground md:px-8">
            Connect, diagnose, publish
          </h3>
          <WooWorkflowCycle />
        </div>
      </Reveal>
    </div>
  </section>
);
