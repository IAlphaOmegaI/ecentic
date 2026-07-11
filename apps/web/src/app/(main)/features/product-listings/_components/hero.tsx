import { CheckIcon } from "@zenncore/icons";

const assurances = [
  "Titles, descriptions & structured data",
  "Approval-ready rewrites",
  "Publishes back to Shopify & WooCommerce",
] as const;

export const Hero = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <div className="px-8 pt-36 pb-16">
        <p className="mb-4 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.2em]">
          Product listings
        </p>
        <h1 className="max-w-3xl font-semibold text-5xl text-foreground-rich tracking-tight md:text-7xl">
          AI product listing optimization{" "}
          <span className="text-primary">for pages that get picked.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-foreground-dimmed leading-relaxed md:text-lg">
          AI shopping systems compare your product data in seconds. Ecentic
          turns losing product pages into clearer buying inputs, for agents and
          for the high-intent shoppers they send you.
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
