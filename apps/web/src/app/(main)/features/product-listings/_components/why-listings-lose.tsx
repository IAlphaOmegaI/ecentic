import { ItemCycle } from "@/app/(main)/_components/item-cycle";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";

const principles = [
  {
    title: "State what the product is",
    description:
      "And who it is for, in language both shoppers and models parse quickly.",
  },
  {
    title: "Surface compared attributes",
    description:
      "The category-specific fields buyers and agents weigh most often.",
  },
  {
    title: "Keep descriptions decisive",
    description:
      "Focused on the decision at hand instead of filler that hides the details.",
  },
  {
    title: "Stay coherent everywhere",
    description:
      "Structured data, offer data, and on-page copy telling the same story.",
  },
] as const;

export const WhyListingsLose = () => (
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
            Why listings struggle in AI-mediated buying.
          </h2>
        </RevealItem>
        <RevealItem>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            Most catalog problems stem from the same gap: product data that was
            built for humans to browse, not for AI systems to compare.
          </p>
        </RevealItem>
      </Reveal>

      <Reveal className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

        <div className="flex flex-col bg-background-dimmed md:min-h-0">
          <RevealItem className="flex flex-col gap-4 p-6 md:p-8">
            <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
              AI shopping systems do not browse a page the way a human does.
              They compare titles, descriptions, structured attributes, price
              context, compatibility details, and trust signals in a compressed
              decision window. If one listing is clearer, more complete, and
              easier to compare, it wins before the shopper ever sees why.
            </p>
            <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
              The fix is not stuffing a page with keywords. It is making product
              information easier to retrieve, evaluate, and trust.
            </p>
          </RevealItem>
          <ItemCycle items={principles} />
        </div>

        <div className="flex min-h-0 flex-col gap-px bg-accent-foreground md:h-full">
          <h3 className="shrink-0 bg-background-rich px-6 pt-6 pb-4 font-body font-medium text-3xl text-foreground md:px-8">
            What winning listings do
          </h3>
          {principles.map((principle, index) => (
            <div
              key={principle.title}
              className="grid min-h-0 flex-1 grid-cols-[2.5rem_1fr] content-start bg-background-rich px-6 py-5 md:grid-cols-[5rem_1fr] md:px-8"
            >
              <span className="font-normal text-lg text-primary tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <RevealItem className="flex flex-col gap-1">
                <h4 className="font-body font-medium text-foreground text-xl">
                  {principle.title}
                </h4>
                <p className="font-light text-foreground-dimmed leading-relaxed">
                  {principle.description}
                </p>
              </RevealItem>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  </section>
);
