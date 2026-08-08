import { CheckIcon } from "@zenncore/icons";
import Image from "next/image";
import { ItemCycle } from "@/app/(main)/_components/item-cycle";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";
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
  {
    title: "Catalog scale",
    description:
      "The catalog is large enough that manual review slows down every update.",
  },
  {
    title: "Justifying changes",
    description:
      "The team needs to explain why a listing change matters before shipping it.",
  },
  {
    title: "Clarity over price",
    description:
      "Competitors keep winning on product clarity rather than price alone.",
  },
  {
    title: "Repeatable loops",
    description:
      "Merchandising leaders want a process instead of isolated one-off edits.",
  },
] as const;

export const Compare = () => (
  <section className="scroll-mt-24 border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <Reveal className="p-6 md:p-12">
        <RevealItem>
          <span className="font-normal text-3xl text-primary">03</span>
        </RevealItem>
        <RevealItem>
          <h2 className="mt-2 max-w-4xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
            Where this fits alongside Shopify Magic.
          </h2>
        </RevealItem>
        <RevealItem>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            Native generation helps merchants produce copy. ecentic helps
            merchants evaluate, prioritize, and improve listings with a direct
            tie back to competitive outcomes.
          </p>
        </RevealItem>
      </Reveal>

      <Reveal className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

        <div className="flex flex-col bg-background-rich p-6 md:p-8">
          <span className="inline-flex w-fit items-center gap-2 border border-[#95BF47]/40 bg-[#95BF47]/10 px-3 py-1 font-medium text-foreground text-sm">
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
          <div className="mt-8 flex flex-col gap-2.5 border-accent-foreground border-t pt-8 md:mt-auto">
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
          <span className="w-fit border border-white/20 bg-white/10 px-3 py-1 font-medium text-sm">
            ecentic on top of Shopify
          </span>
          <h3 className="mt-4 font-body font-medium text-2xl">
            Built for winning the comparison.
          </h3>
          <p className="mt-2 font-body font-light text-lg text-white">
            The value is not only rewriting text. It is knowing whether your
            page is easy for an AI shopping system to evaluate, and whether the
            proposed change improves your chance of being selected.
          </p>
          <div className="mt-8 flex flex-col gap-2.5 border-white/20 border-t pt-8 md:mt-auto">
            {ecenticStrengths.map((strength) => (
              <div key={strength} className="flex items-start gap-2">
                <CheckIcon className="mt-1 size-4 shrink-0 text-white/80" />
                <p className="font-body font-light text-white">{strength}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

        <div className="flex flex-col bg-background-dimmed md:min-h-0">
          <RevealItem className="flex flex-col gap-4 p-6 md:p-8">
            <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
              Generation alone is enough when speed is the only goal. The
              distinction starts to matter once the catalog, the competitors, or
              the review process get in the way.
            </p>
          </RevealItem>
          <ItemCycle items={triggers} />
        </div>

        <div className="flex min-h-0 flex-col gap-px bg-accent-foreground md:h-full">
          <h3 className="shrink-0 bg-background-rich px-6 pt-6 pb-4 font-body font-medium text-3xl text-foreground md:px-8">
            When the distinction starts to matter
          </h3>
          {triggers.map((trigger, index) => (
            <div
              key={trigger.title}
              className="grid min-h-0 flex-1 grid-cols-[2.5rem_1fr] content-start bg-background-rich px-6 py-5 md:grid-cols-[5rem_1fr] md:px-8"
            >
              <span className="font-normal text-lg text-primary tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <RevealItem className="flex flex-col gap-1">
                <h4 className="font-body font-medium text-foreground text-xl">
                  {trigger.title}
                </h4>
                <p className="font-light text-foreground-dimmed leading-relaxed">
                  {trigger.description}
                </p>
              </RevealItem>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  </section>
);
