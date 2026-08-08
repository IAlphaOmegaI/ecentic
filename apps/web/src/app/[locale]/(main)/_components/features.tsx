import {
  BarChartIcon,
  CodeIcon,
  HammerIcon,
  ShieldCheckIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";

const features = [
  {
    icon: BarChartIcon,
    color: "text-blue-500",
    title: "Your AI score",
    description:
      "See how often ChatGPT, Claude, Gemini, and Perplexity pick your products.",
  },
  {
    icon: ShieldCheckIcon,
    color: "text-green-500",
    title: "Beat your competitors",
    description:
      "Find out who agents recommend instead of you, and what they have that you don't.",
  },
  {
    icon: HammerIcon,
    color: "text-red-500",
    title: "One-click fixes",
    description:
      "ecentic rewrites your titles, descriptions, and product data so agents choose you.",
  },
  {
    icon: CodeIcon,
    color: "text-purple-500",
    title: "Track the payoff",
    description: "Watch AI-agent visits and revenue grow week over week.",
  },
] as const;

export const Features = () => (
  <section
    id="features"
    className="relative -left-[calc(50vw-50%)] -z-1 w-screen scroll-mt-[5.5rem]"
  >
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-y">
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      <div className="relative p-6 md:p-12">
        <h2 className="font-body font-medium text-3xl text-foreground md:text-5xl">
          Everything you need to win the AI shopper.
        </h2>
      </div>
      <Reveal className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        {features.map((feature, index) => (
          <RevealItem
            key={feature.title}
            className="relative flex flex-col justify-end gap-2 bg-background-dimmed p-4 md:h-82"
          >
            {index === 0 && (
              <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
            )}
            {index === 0 && (
              <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:flex" />
            )}
            {index === 2 && (
              <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:flex" />
            )}
            <feature.icon className={cn(feature.color, "size-16")} />
            <h2 className="font-body font-medium text-2xl text-foreground md:text-4xl">
              {feature.title}
            </h2>
            <p className="font-body font-light text-foreground-dimmed text-lg">
              {feature.description}
            </p>
          </RevealItem>
        ))}
      </Reveal>
    </div>
  </section>
);
