import { ArrowRightIcon, CheckIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { BookCall } from "@/components/cal";

const assurances = [
  "Multi-brand dashboards",
  "Custom API access",
  "Dedicated CSM",
  "SOC 2 in progress",
] as const;

export const Hero = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <div className="px-8 pt-36 pb-16">
        <p className="mb-4 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.2em]">
          Enterprise
        </p>
        <h1 className="max-w-3xl font-semibold text-5xl text-foreground-rich tracking-tight md:text-7xl">
          Agent-commerce infrastructure{" "}
          <span className="text-primary">at scale.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-foreground-dimmed leading-relaxed md:text-lg">
          Multi-brand dashboards, API access, UCP signing, and dedicated support
          for commerce teams running hundreds of SKUs across multiple platforms.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <BookCall
            color="primary"
            className="w-full px-5 py-2.5 text-base sm:w-auto"
          >
            Talk to sales
            <ArrowRightIcon className="size-4" />
          </BookCall>
          <Button
            color="accent"
            className="w-full px-5 py-2.5 text-base sm:w-auto"
            render={<Link href="/pricing" />}
          >
            View pricing
          </Button>
        </div>
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
