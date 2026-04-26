import { ArrowRightIcon, ShieldCheckIcon } from "@zenncore/icons";
import Link from "next/link";

export const UCPCallout = () => (
  <section className="border-accent-foreground border-y px-4 py-10 md:py-14">
    <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-4">
        <ShieldCheckIcon className="mt-1 size-8 shrink-0 text-primary" />
        <div>
          <p className="font-medium text-primary text-xs uppercase tracking-[0.2em]">
            Universal Commerce Protocol
          </p>
          <h2 className="mt-1 font-medium text-2xl text-foreground md:text-3xl">
            Is your store visible to AI agents?
          </h2>
          <p className="mt-2 max-w-xl font-light text-base text-foreground-dimmed md:text-lg">
            Check your store's UCP profile in 10 seconds — see whether GPTBot,
            ClaudeBot, Gemini, and Perplexity can read your listings without
            friction.
          </p>
        </div>
      </div>
      <Link
        href="/ucp-validator"
        className="group inline-flex shrink-0 items-center gap-2 border border-primary px-6 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white"
      >
        Check your store free
        <ArrowRightIcon className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
      </Link>
    </div>
  </section>
);
