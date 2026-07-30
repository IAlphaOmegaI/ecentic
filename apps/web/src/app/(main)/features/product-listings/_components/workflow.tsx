import { ItemCycle } from "@/app/(main)/_components/item-cycle";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";
import { ListingWorkflowCycle } from "./listing-workflow-cycle";

const audiences = [
  {
    title: "Discovery without a full rewrite",
    description:
      "Improve product discovery without rewriting the whole catalog at once.",
  },
  {
    title: "Large, uneven catalogs",
    description:
      "Hundreds or thousands of SKUs where data quality varies by category and age.",
  },
  {
    title: "Spec-led categories",
    description:
      "Wins that turn on specifications, compatibility, and merchant trust signals.",
  },
  {
    title: "Repeatable content ops",
    description:
      "Teams that need a process for product content at scale, not one-off edits.",
  },
] as const;

export const Workflow = () => (
  <section className="scroll-mt-24 border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <Reveal className="p-6 md:p-12">
        <RevealItem>
          <span className="font-normal text-3xl text-primary">03</span>
        </RevealItem>
        <RevealItem>
          <h2 className="mt-2 max-w-4xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
            A closed loop, not a one-off rewrite.
          </h2>
        </RevealItem>
        <RevealItem>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            The workflow runs from simulation to diagnosis to an approval-ready
            listing update, without rebuilding your catalog from scratch.
          </p>
        </RevealItem>
      </Reveal>

      <Reveal className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

        <div className="flex flex-col bg-background-dimmed md:min-h-0">
          <RevealItem className="flex flex-col gap-4 p-6 md:p-8">
            <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
              Simulate who wins, diagnose the gaps, then publish the fix back
              into the store. The same loop works whether you are cleaning up a
              handful of priority SKUs or running continuous catalog ops.
            </p>
          </RevealItem>
          <ItemCycle items={audiences} />
        </div>

        <div className="flex min-h-0 flex-col gap-px bg-accent-foreground md:h-full">
          <h3 className="shrink-0 bg-background-rich px-6 pt-6 pb-4 font-body font-medium text-3xl text-foreground md:px-8">
            Simulate, diagnose, publish
          </h3>
          <ListingWorkflowCycle />
        </div>
      </Reveal>
    </div>
  </section>
);
