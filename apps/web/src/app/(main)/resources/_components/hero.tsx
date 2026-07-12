import { ArrowRightIcon, CheckIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { Motion } from "@/components/motion";

const assurances = [
  "No credit card",
  "Validator works without an account",
  "Results in about two minutes",
] as const;

export const Hero = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Motion.Stagger className="px-8 pt-36 pb-16">
        <Motion.Item>
          <p className="mb-4 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.2em]">
            Resources
          </p>
        </Motion.Item>
        <Motion.Item>
          <h1 className="max-w-3xl font-semibold text-5xl text-foreground-rich tracking-tight md:text-7xl">
            Free tools and guides{" "}
            <span className="text-primary">for agent commerce.</span>
          </h1>
        </Motion.Item>
        <Motion.Item>
          <p className="mt-6 max-w-2xl text-base text-foreground-dimmed leading-relaxed md:text-lg">
            Diagnose your catalog, validate your protocol surface, or inspect a
            live agent workflow before you commit to anything.
          </p>
        </Motion.Item>
        <Motion.Item className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            color="primary"
            className="w-full px-5 py-2.5 text-base sm:w-auto"
            render={<Link href="/sign-up" />}
          >
            Scan your store free
            <ArrowRightIcon className="size-4" />
          </Button>
          <Button
            color="accent"
            className="w-full px-5 py-2.5 text-base sm:w-auto"
            render={<Link href="/ucp-validator" />}
          >
            Validate a store
          </Button>
        </Motion.Item>
        <Motion.Item>
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
        </Motion.Item>
      </Motion.Stagger>
    </div>
  </section>
);
