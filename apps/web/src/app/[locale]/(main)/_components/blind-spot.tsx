import { EyeClosedIcon, RobotIcon, SearchIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Plus } from "@/components/plus";
import Product from "@/public/images/product.png";

const story = [
  {
    icon: SearchIcon,
    step: "A customer asks",
    description:
      "“Find me the best shisha flavour under £30.” They never open a store or scroll a results page.",
  },
  {
    icon: RobotIcon,
    step: "The agent picks 3",
    description:
      "In milliseconds the AI compares structured data, trust signals, and spec depth — then names three products.",
  },
  {
    icon: EyeClosedIcon,
    step: "You're invisible",
    description:
      "Your store didn't show up. You don't know it happened. Shopify analytics never sees the visit.",
  },
] as const;

export const BlindSpot = () => (
  <section>
    <div className="relative border-accent-foreground border-y p-4 md:p-8">
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      <div className="mb-3 flex items-center gap-2 md:mb-5">
        <span className="relative flex size-4 shrink-0 items-center justify-center">
          <span className="absolute size-full animate-ping rounded-full bg-primary opacity-40" />
          <span className="relative size-2.5 rounded-full bg-primary" />
        </span>
        <span className="font-light text-primary text-xl">The Blind Spot</span>
      </div>
      <h2 className="mb-3 max-w-3xl font-body text-3xl text-foreground leading-none tracking-tight md:mb-5 md:text-6xl">
        Your products are invisible to the buyers that matter most.
      </h2>
      <p className="max-w-4xl font-light text-foreground-dimmed text-lg md:text-2xl">
        AI agents are already shopping for your customers. They don't see ads or
        scroll your page. They read data, compare specs, and choose in
        milliseconds. You don't know how often they pick you or how to change
        it.{" "}
        <span className="underline">
          <span className="text-primary">ecentic</span> fixes this.
        </span>
      </p>
    </div>
    <div className="relative grid border-accent-foreground border-b bg-background-dimmed md:grid-cols-3">
      <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
      <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
      {story.map(({ icon: Icon, step, description }, index) => (
        <div
          key={step}
          className={`relative flex flex-col gap-3 border-accent-foreground border-b p-4 md:border-b-0 md:p-8 ${index < story.length - 1 ? "md:border-r" : ""}`}
        >
          {index < story.length - 1 && (
            <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
          )}
          <div className="flex items-center gap-3">
            <span className="font-semibold text-5xl text-primary tabular-nums leading-none">
              {index + 1}
            </span>
            <Icon className="size-9 text-primary" />
          </div>
          <h3 className="font-medium text-2xl text-foreground md:text-3xl">
            {step}
          </h3>
          <p className="font-light text-base text-foreground-dimmed md:text-lg">
            {description}
          </p>
        </div>
      ))}
    </div>
    <div className="grid border-accent-foreground border-b bg-background-dimmed md:grid-cols-3">
      {/* Col 1 — What Humans See */}
      <div className="flex flex-col items-center justify-center border-accent-foreground border-b p-4 md:border-r md:border-b-0">
        <p className="font-light text-primary text-xl">What Humans see</p>
        <Image src={Product} alt="Hero" className="w-full" />
        <div className="flex w-full flex-col">
          <h3 className="font-medium text-4xl text-foreground">
            Pro Wireless Earbuds - Light
          </h3>
          <p className="mb-4 font-light text-foreground-dimmed text-xl">
            Immerse yourself in crystal-clear sound with our award-winning
            ergonomic design. The perfect companion for your daily commute.
          </p>
          <Button
            color="primary"
            type="button"
            className="w-full p-4 font-medium text-xl"
          >
            Add to Cart - $139
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between border-accent-foreground border-b p-4 md:border-t-0 md:border-r md:border-b-0">
        <p className="font-light text-primary text-xl">What Agents see now</p>
        <p className="font-light font-mono text-primary text-xl">
          {"{"}
          <br />
          "product": <span className="text-green-400">"Earbuds"</span>,<br />
          "brand": <span className="text-green-400">"Pro Audio"</span>, <br />
          "price": <span className="text-amber-400">139.00</span>, <br />
          <span className="text-red-500 line-through">"battery_life"</span>:{" "}
          <span className="text-red-500">null</span>, <br />
          <span className="text-gray-400">{"// FATAL: Agent Rejected"}</span>{" "}
          <br />
          <span className="text-red-500 line-through">"warranty"</span>:{" "}
          <span className="text-red-500">null</span>, <br />
          <span className="text-gray-400">{"// FATAL: Agent Rejected"}</span>{" "}
          <br />
          "description":
          <span className="text-green-400">"Immerse yourself ..."</span> <br />
          {"}"}
        </p>
        <h1 className="text-center font-light text-2xl text-red-500">
          RESULT: Dropped from consideration set. Competitor chosen due to
          explicit spec verification.
        </h1>
      </div>

      <div className="flex flex-col justify-between p-4">
        <p className="text-center font-light text-primary text-xl">
          What Agents see after ecentic
        </p>

        <div className="flex flex-col items-center pt-6 pb-2 text-center">
          <span className="font-semibold text-8xl text-primary tabular-nums leading-none">
            #1
          </span>
          <p className="mt-3 font-medium text-2xl text-foreground">
            Pro Wireless Earbuds
          </p>
          <p className="font-light text-base text-foreground-dimmed">
            Pro Audio · $139
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {[
            { model: "ChatGPT", logo: "/images/chatgpt.svg", score: 89 },
            { model: "Claude", logo: "/images/claude.svg", score: 82 },
            { model: "Gemini", logo: "/images/gemini.svg", score: 81 },
            { model: "Perplexity", logo: "/images/perplexity.svg", score: 85 },
          ].map(({ model, logo, score }) => (
            <div key={model} className="flex items-center gap-4">
              <Image
                src={logo}
                alt={model}
                width={32}
                height={32}
                className="shrink-0"
              />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-base text-foreground">
                    {model}
                  </span>
                  <span className="font-semibold text-lg text-primary tabular-nums">
                    {score}%
                  </span>
                </div>
                <div className="h-1 w-full bg-accent-foreground">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <h1 className="text-center font-light text-2xl text-primary">
          RESULT: Top pick across ChatGPT, Claude, Gemini & Perplexity.
        </h1>
      </div>
    </div>
    <div className="flex h-12 justify-center border-accent-foreground border-b bg-background-dimmed" />
    <div className="relative grid border-accent-foreground border-b bg-background-dimmed md:grid-cols-3">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      <div className="col-span-2 p-4">
        <p className="font-light text-foreground-dimmed text-lg md:text-2xl">
          Every sale you're losing to a competitor right now, an AI agent made
          that call. Find out exactly where you stand.
        </p>
      </div>
      <div className="flex items-center p-6">
        <Button
          color="primary"
          type="button"
          className="mt-auto w-full"
          render={<Link href="/sign-up" />}
        >
          See your AI agent score — it's free
        </Button>
      </div>
    </div>
  </section>
);
