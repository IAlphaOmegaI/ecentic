import { cn } from "@zenncore/utils";
import { Plus } from "@/components/plus";

type Situation = {
  situation: string;
  title: string;
  description: string;
  fit: string;
  covered: boolean;
};

const situations: readonly Situation[] = [
  {
    situation: "Situation 01",
    title: "Content production",
    description:
      "The catalog is growing faster than the team can write or review product copy. A content generation tool helps here, though it never answers which changes actually improve product selection.",
    fit: "A copy generator covers this",
    covered: false,
  },
  {
    situation: "Situation 02",
    title: "Competitive clarity",
    description:
      "The team is not sure which products are losing to competitors or why. More copy does not fix this. What helps is simulating how products compare and surfacing the attributes making the difference.",
    fit: "Where ecentic fits",
    covered: true,
  },
  {
    situation: "Situation 03",
    title: "Publishing friction",
    description:
      "Good insights exist but turn into live improvements slowly because review and publishing are disconnected from the store. An approve-and-publish path inside WooCommerce cuts the handoff cost.",
    fit: "Where ecentic fits",
    covered: true,
  },
] as const;

export const Evaluate = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">03</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          Find your catalog bottleneck first.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          The right optimization tool depends on where the bottleneck actually
          sits. WooCommerce merchants usually face one of three situations.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-3">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        {situations.map((situation) => (
          <div
            key={situation.title}
            className="flex flex-col gap-2 bg-background-rich p-6 md:p-8"
          >
            <p className="font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em]">
              {situation.situation}
            </p>
            <h3 className="mt-2 font-body font-medium text-2xl text-foreground">
              {situation.title}
            </h3>
            <p className="font-body font-light text-foreground-dimmed">
              {situation.description}
            </p>
            <span
              className={cn(
                "mt-6 w-fit rounded-full border px-3 py-1 font-medium text-sm md:mt-auto",
                situation.covered
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-accent-foreground bg-background text-foreground-dimmed",
              )}
            >
              {situation.fit}
            </span>
          </div>
        ))}
      </div>
    </div>
  </section>
);
