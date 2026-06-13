import { ArrowRightIcon, ShieldCheckIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { Plus } from "@/components/plus";

export const UCPCallout = () => (
  <section className="relative border-accent-foreground border-y p-6">
    <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
    <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
    <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
    <Plus className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
    <div className="flex flex-col items-start gap-6 md:flex-row md:justify-between">
      <div className="flex items-start gap-4">
        <ShieldCheckIcon className="size-14 shrink-0 text-primary" />
        <div>
          {/* <p className="font-medium text-primary text-sm uppercase tracking-[0.2em]">
            Universal Commerce Protocol
          </p> */}
          <h2 className="font-medium text-2xl text-foreground md:text-3xl">
            Is your store visible to AI agents?
          </h2>
          <p className="mt-2 max-w-xl font-light text-base text-foreground-dimmed md:text-lg">
            Check your store's UCP profile in 10 seconds — see whether GPTBot,
            ClaudeBot, Gemini, and Perplexity can read your listings without
            friction.
          </p>
        </div>
      </div>
      <Button
        variant="flat"
        color="primary"
        render={<Link href="/ucp-validator" />}
      >
        Check your store free
        <ArrowRightIcon className="size-4" />
      </Button>
    </div>
  </section>
);
