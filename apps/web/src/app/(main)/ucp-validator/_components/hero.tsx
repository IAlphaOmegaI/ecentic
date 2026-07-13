import { ArrowRightIcon, CheckIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { Motion } from "@/components/motion";

const assurances = [
  "Free to use",
  "No account required",
  "Live /.well-known/ucp fetch",
] as const;

export const Hero = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Motion.Stagger className="px-8 pt-36 pb-16">
        <Motion.Item>
          <p className="mb-4 font-medium text-primary text-sm">
            Protocol check
          </p>
        </Motion.Item>
        <Motion.Item>
          <h1 className="max-w-3xl font-semibold text-5xl text-foreground-rich tracking-tight md:text-7xl">
            UCP Validator
          </h1>
        </Motion.Item>
        <Motion.Item>
          <p className="mt-6 max-w-2xl text-base text-foreground-dimmed leading-relaxed md:text-lg">
            Check whether a storefront publishes a valid{" "}
            <span className="text-foreground">Universal Commerce Profile</span>{" "}
            at{" "}
            <span className="font-mono text-foreground">
              /.well-known/ucp
            </span>{" "}
            and whether shopping agents can read it without friction.
          </p>
        </Motion.Item>
        <Motion.Item className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            color="primary"
            className="w-full px-5 py-2.5 text-base sm:w-auto"
            render={<Link href="#validate" />}
          >
            Validate a domain
            <ArrowRightIcon className="size-4" />
          </Button>
          <Button
            color="accent"
            className="w-full px-5 py-2.5 text-base sm:w-auto"
            render={<Link href="/ucp-playground" />}
          >
            Open playground
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
