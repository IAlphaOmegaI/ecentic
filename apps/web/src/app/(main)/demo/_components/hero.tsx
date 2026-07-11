import { CheckIcon } from "@zenncore/icons";

const assurances = [
  "15 minutes, not a slide deck",
  "No account or catalog connection needed",
  "No procurement deck required",
] as const;

export const Hero = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <div className="px-8 pt-36 pb-16">
        <p className="mb-4 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.2em]">
          Book a demo
        </p>
        <h1 className="max-w-3xl font-semibold text-5xl text-foreground-rich tracking-tight md:text-7xl">
          See your AI win rate,{" "}
          <span className="text-primary">live in 15 minutes.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-foreground-dimmed leading-relaxed md:text-lg">
          We run your top products through GPT-4, Claude, Gemini, and Perplexity
          while you watch, show you why you win or lose, and scope the
          highest-impact listing fixes. Pick a slot below.
        </p>
        <ul className="mt-8 flex flex-wrap gap-2">
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
    </div>
  </section>
);
