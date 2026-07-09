import { CheckIcon } from "@zenncore/icons";
import { Plus } from "@/components/plus";

const assurances = [
  "Free scan first",
  "No card to start",
  "Month-to-month · cancel anytime",
] as const;

export const Hero = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x px-6 pt-10 pb-14 md:px-12 md:pt-16 md:pb-20">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-radial-[at_20%_0%] from-primary/15 via-primary/5 to-transparent"
      />
      <p className="relative font-medium text-primary text-sm uppercase tracking-[0.2em]">
        Pricing
      </p>
      <h1 className="relative mt-4 max-w-3xl font-body font-medium text-4xl text-foreground-rich md:text-6xl">
        Start free. Pay when agents{" "}
        <span className="text-primary">pick you.</span>
      </h1>
      <p className="relative mt-5 max-w-2xl font-light text-foreground-dimmed text-lg">
        Scan your store for free, then choose how you pay: a small fee only on
        orders AI agents drive, or a flat monthly plan with no fee. Same
        optimization loop either way.
      </p>
      <ul className="relative mt-8 flex flex-wrap gap-2">
        {assurances.map((assurance) => (
          <li
            key={assurance}
            className="flex items-center gap-1.5 rounded-full border border-accent-foreground bg-background-rich px-3 py-1 text-foreground text-sm"
          >
            <CheckIcon className="size-3.5 text-primary" />
            {assurance}
          </li>
        ))}
      </ul>
    </div>
  </section>
);
