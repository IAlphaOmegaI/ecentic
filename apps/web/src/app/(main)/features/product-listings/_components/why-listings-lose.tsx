import { FaceSearchIcon } from "@zenncore/icons";
import { Plus } from "@/components/plus";

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
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">01</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          Why listings struggle in AI-mediated buying.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          Most catalog problems stem from the same gap: product data that was
          built for humans to browse, not for AI systems to compare.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        <div className="flex flex-col gap-6 bg-background-dimmed p-6 md:p-8">
          <FaceSearchIcon className="size-8 text-primary" />
          <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
            AI shopping systems do not browse a page the way a human does. They
            compare titles, descriptions, structured attributes, price context,
            compatibility details, and trust signals in a compressed decision
            window. If one listing is clearer, more complete, and easier to
            compare, it wins before the shopper ever sees why.
          </p>
          <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
            The fix is not stuffing a page with keywords. It is making product
            information easier to retrieve, evaluate, and trust.
          </p>
        </div>
        <div className="flex flex-col gap-px bg-accent-foreground">
          <p className="bg-background-rich px-6 pt-6 pb-4 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em] md:px-8">
            What winning listings do
          </p>
          {principles.map((principle) => (
            <div
              key={principle.title}
              className="flex flex-1 flex-col gap-1 bg-background-rich px-6 py-5 md:px-8"
            >
              <h3 className="font-body font-medium text-foreground text-xl">
                {principle.title}
              </h3>
              <p className="font-light text-foreground-dimmed leading-relaxed">
                {principle.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
