import { RobotIcon, ShieldCheckIcon, ShoppingCartIcon } from "@zenncore/icons";
import { SectionGutter } from "@/app/(main)/dashboard/_components/grid";
import { Plus } from "@/components/plus";

const steps = [
  {
    label: "01",
    visual: <RobotIcon className="size-8 text-primary" />,
    title: "An agent recommends you",
    description:
      "A shopper asks ChatGPT, Gemini, or Perplexity what to buy — and your optimized listing wins the comparison.",
  },
  {
    label: "02",
    visual: <ShoppingCartIcon className="size-8 text-primary" />,
    title: "They buy — a $120 order",
    description:
      "The order carries our attribution signal or follows a recent AI-referral visit to your store.",
  },
  {
    label: "03",
    visual: (
      <span className="font-body font-medium text-3xl text-primary tracking-tight">
        $3.60
      </span>
    ),
    title: "We take 3% of that order",
    description:
      "Charged only on AI-attributed orders. Your other sales are never touched — and never per agent visit.",
  },
  {
    label: "04",
    visual: <ShieldCheckIcon className="size-8 text-primary" />,
    title: "Fees stop at $500/mo",
    description:
      "A hard monthly cap, no matter how much agents sell. No card until a fee is actually due.",
  },
] as const;

export const FeeExplainer = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      {/* Top corners are owned by the Plans section's bottom pluses. */}
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <SectionGutter />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">02</span>
        <h2 className="mt-2 max-w-2xl font-body font-medium text-4xl text-foreground md:text-6xl">
          How the performance fee works
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          On pay-as-you-go you only ever pay on orders we can attribute to
          AI-agent traffic we optimize for. Everything else is $0.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-2 lg:grid-cols-4">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        {steps.map((step) => (
          <div
            key={step.label}
            className="flex flex-col gap-4 bg-background-rich p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 items-center">{step.visual}</div>
              <span
                aria-hidden
                className="font-normal text-3xl text-primary leading-none"
              >
                {step.label}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-body font-medium text-foreground text-xl">
                {step.title}
              </h3>
              <p className="font-body font-light text-foreground-dimmed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-accent-foreground border-t bg-background-dimmed p-6 md:px-12 md:py-8">
        <h3 className="font-body font-medium text-2xl text-foreground">
          Prefer predictable billing?
        </h3>
        <p className="mt-1 max-w-3xl font-body font-light text-foreground-dimmed text-lg">
          Compete and Dominate are flat monthly with no performance fee — both
          run the exact same optimization loop.
        </p>
      </div>
    </div>
  </section>
);
