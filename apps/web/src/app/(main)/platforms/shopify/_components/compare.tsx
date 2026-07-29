import { CheckIcon } from "@zenncore/icons";
import Image from "next/image";
import { Plus } from "@/components/plus";
import shopify from "@/public/images/shopify.svg";

const nativeStrengths = [
  "Native content generation inside the Shopify admin",
  "Quick description drafts for early merchandising work",
  "Fast copy variations when speed is the only goal",
] as const;

const ecenticStrengths = [
  "Simulates how AI shopping agents compare your products",
  "Benchmarks listings against the competitors that keep winning",
  "Diagnoses why a page loses: missing data, weak positioning, unclear context",
  "Turns findings into approval-ready updates published back to Shopify",
] as const;

const triggers = [
  "The catalog is large enough that manual review slows down every update",
  "The team needs to justify why a listing change matters",
  "Competitors keep winning on product clarity rather than price alone",
  "Merchandising leaders want a repeatable loop instead of isolated edits",
] as const;

export const Compare = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">03</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          Where this fits alongside Shopify Magic.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          Native generation helps merchants produce copy. ecentic helps
          merchants evaluate, prioritize, and improve listings with a direct tie
          back to competitive outcomes.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

        <div className="flex flex-col bg-background-rich p-6 md:p-8">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#95BF47]/40 bg-[#95BF47]/10 px-3 py-1 font-medium text-foreground text-sm">
            <Image src={shopify} alt="" className="size-4" />
            Shopify Magic
          </span>
          <h3 className="mt-4 font-body font-medium text-2xl text-foreground">
            Great for faster drafting.
          </h3>
          <p className="mt-2 font-body font-light text-foreground-dimmed text-lg">
            Native AI tools save time when the job is producing copy, especially
            for early-stage merchandising work.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 border-accent-foreground border-t pt-6 md:mt-auto">
            {nativeStrengths.map((strength) => (
              <div key={strength} className="flex items-start gap-2">
                <CheckIcon className="mt-1 size-4 shrink-0 text-[#5E8E3E]" />
                <p className="font-body font-light text-foreground-dimmed">
                  {strength}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col bg-primary p-6 text-white md:p-8">
          <span className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 font-medium text-sm">
            ecentic on top of Shopify
          </span>
          <h3 className="mt-4 font-body font-medium text-2xl">
            Built for winning the comparison.
          </h3>
          {/* Solid white is the ceiling on #1572fa at 4.36:1 — every tint below
              it drops fast (/80 = 3.34, /75 = 3.11), and these are load-bearing
              claims, not chrome. The check icons stay tinted: an icon answers to
              the 3:1 non-text threshold, which /80 clears. */}
          <p className="mt-2 font-body font-light text-lg text-white">
            The value is not only rewriting text. It is knowing whether your
            page is easy for an AI shopping system to evaluate, and whether the
            proposed change improves your chance of being selected.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 border-white/20 border-t pt-6 md:mt-auto">
            {ecenticStrengths.map((strength) => (
              <div key={strength} className="flex items-start gap-2">
                <CheckIcon className="mt-1 size-4 shrink-0 text-white/80" />
                <p className="font-body font-light text-white">{strength}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-accent-foreground border-t p-6 md:p-8">
        <p className="font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em]">
          When the distinction starts to matter
        </p>
        <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
          {triggers.map((trigger) => (
            <li key={trigger} className="flex items-start gap-2">
              <CheckIcon className="mt-1 size-4 shrink-0 text-primary" />
              <p className="font-body font-light text-foreground-dimmed">
                {trigger}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);
