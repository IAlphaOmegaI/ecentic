import { SearchIcon, StarHandIcon } from "@zenncore/icons";
import Image from "next/image";
import { Plus } from "@/components/plus";

const oldResults = [
  {
    rank: "Ad",
    title: "Sony WH-1000XM5 Wireless",
    host: "bestbuy.com",
    rating: "4.6",
  },
  {
    rank: "1",
    title: "Bose QuietComfort Ultra",
    host: "bose.com",
    rating: "4.5",
  },
  { rank: "2", title: "Apple AirPods Max", host: "apple.com", rating: "4.4" },
];

export const DiscoveryShift = () => (
  <section className="relative border-accent-foreground border-y">
    <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
    <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
    <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
    <Plus className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
    <div className="p-4 md:p-8">
      <div className="mb-3 flex items-center gap-2 md:mb-5">
        <span className="size-6 animate-pulse rounded-full bg-primary" />
        <span className="font-light text-primary text-xl">The Shift</span>
      </div>
      <h2 className="mb-3 max-w-3xl font-body text-3xl text-foreground leading-none tracking-tight md:mb-5 md:text-6xl">
        E-commerce just changed forever.
      </h2>
      <p className="max-w-4xl font-light text-foreground-dimmed text-lg md:text-2xl">
        For 20 years shoppers got ten blue links and chose for themselves. Now
        they ask one question and an AI agent hands back{" "}
        <span className="text-foreground">a single answer</span>. You're the
        pick — or you don't exist.
      </p>
    </div>

    <div className="relative grid border-accent-foreground border-t bg-background-dimmed md:grid-cols-2">
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 hidden md:flex" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 hidden md:flex" />
      {/* Before — the search era */}
      <div className="relative flex flex-col border-accent-foreground border-b p-4 md:border-r md:border-b-0 md:p-8">
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 hidden md:flex" />
        <Plus className="bottom-0 right-0 translate-x-1/2 translate-y-1/2 hidden md:flex" />
        <div className="mb-4 flex items-center gap-2 text-foreground-dimmed">
          <SearchIcon className="size-5" />
          <span className="font-light text-lg">Before — the search era</span>
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-accent-foreground bg-background p-4">
          <div className="flex items-center gap-2 rounded-full border border-accent-foreground px-4 py-2 text-foreground-dimmed text-sm">
            <SearchIcon className="size-4" />
            best noise cancelling headphones
          </div>
          <p className="text-foreground-dimmed text-xs">
            About 123,000,000 results
          </p>
          {oldResults.map((result) => (
            <div key={result.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-sm bg-accent-foreground font-medium text-foreground-dimmed text-xs">
                {result.rank}
              </span>
              <div className="flex flex-col">
                <span className="font-medium text-foreground text-sm">
                  {result.title}
                </span>
                <span className="text-foreground-dimmed text-xs">
                  {result.host} · ★ {result.rating}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 font-light text-base text-foreground-dimmed md:text-lg">
          Ten results. You could rank, run ads, and earn the click. Visibility
          was something you could buy and optimize for.
        </p>
      </div>

      {/* Now — the agent era */}
      <div className="flex flex-col p-4 md:p-8">
        <div className="mb-4 flex items-center gap-2 text-primary">
          <Image
            src="/images/chatgpt.svg"
            alt="ChatGPT"
            width={20}
            height={20}
            className="size-5"
          />
          <span className="font-light text-lg">Now — the agent era</span>
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-primary/40 bg-background p-4">
          <div className="self-end rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-white">
            What are the best noise cancelling headphones?
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-accent-foreground p-3">
            <div className="flex items-center gap-2">
              <StarHandIcon className="size-4 text-primary" />
              <span className="font-medium text-foreground text-sm">
                Sony WH-1000XM5 — $348
              </span>
            </div>
            <p className="font-light text-foreground-dimmed text-xs">
              Best overall. Industry-leading noise cancellation, excellent
              sound, all-day comfort.
            </p>
          </div>
        </div>
        <p className="mt-4 font-light text-base text-foreground-dimmed md:text-lg">
          One question. One answer. No ads, no scrolling, no second place. The
          agent decides in milliseconds — and you never see it happen.
        </p>
      </div>
    </div>
  </section>
);
