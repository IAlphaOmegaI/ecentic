import { CheckIcon } from "@zenncore/icons";
import { BookingEmbed } from "@/components/cal";

const expectations = [
  {
    title: "Live win-rate read",
    description:
      "We run your top products through GPT-4, Claude, Gemini, and Perplexity while you watch.",
  },
  {
    title: "Why you win or lose",
    description:
      "A plain-English diagnosis of the title, pricing, and trust signals agents weigh.",
  },
  {
    title: "Your first optimizations",
    description:
      "Leave with the highest-impact listing changes — no procurement deck required.",
  },
] as const;

export const Booking = () => (
  <section
    id="book"
    className="relative -left-[calc(50vw-50%)] w-screen scroll-mt-[5.5rem]"
  >
    <div className="mx-auto max-w-6xl border-accent-foreground border-y">
      <div className="relative border-accent-foreground p-6 md:p-12">
        <p className="font-medium text-primary text-xs uppercase tracking-[0.24em]">
          Book a call
        </p>
        <h2 className="mt-4 max-w-3xl font-body text-3xl text-foreground md:text-6xl">
          See your AI win rate, <br className="hidden md:block" />
          live in 15 minutes.
        </h2>
        <p className="mt-5 max-w-2xl font-body font-light text-foreground-dimmed text-lg">
          Pick a slot and we’ll simulate how AI shopping agents compare your
          catalog against the competition — then show you exactly what to fix.
        </p>
      </div>

      <div className="grid grid-cols-1 border-accent-foreground border-t md:grid-cols-5">
        <div className="flex flex-col divide-y divide-accent-foreground border-accent-foreground md:col-span-2 md:border-r">
          {expectations.map((expectation) => (
            <div key={expectation.title} className="flex gap-4 p-6 md:p-8">
              <span className="flex size-10 shrink-0 items-center justify-center border border-accent-foreground bg-background text-primary">
                <CheckIcon className="size-5" />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-medium text-foreground text-lg">
                  {expectation.title}
                </h3>
                <p className="font-light text-base text-foreground-dimmed">
                  {expectation.description}
                </p>
              </div>
            </div>
          ))}
          <p className="mt-auto p-6 font-light text-foreground-dimmed text-sm md:p-8">
            No card, no commitment — just a 15-minute look at how agents see your
            catalog. Pick a time on the right and you’re booked.
          </p>
        </div>

        <div className="h-[620px] w-full overflow-hidden bg-background md:col-span-3">
          <BookingEmbed />
        </div>
      </div>
    </div>
  </section>
);
