import {
  BarChartIcon,
  CodeIcon,
  HammerIcon,
  ShieldCheckIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";

const features = [
  {
    icon: BarChartIcon,
    color: "text-blue-500",
    title: "Agent Win Rate Dashboard",
    description:
      "See how often each product in your catalog is selected by AI agents versus competitors, broken down by model across GPT-4, Claude, and Gemini.",
  },
  {
    icon: ShieldCheckIcon,
    color: "text-green-500",
    title: "Multi-Model Engine",
    description:
      "Every product is tested across multiple AI agent models, each mapped to their unique selection logic and ranking biases.",
  },
  {
    icon: HammerIcon,
    color: "text-red-500",
    title: "Competitor Battlecards",
    description:
      "Know exactly which competitor products are beating yours and on which specific attributes AI agents are choosing them over you.",
  },
  {
    icon: CodeIcon,
    color: "text-purple-500",
    title: "UCP Readiness & Structured Data",
    description:
      "Generate your structured merchant profile and extract missing attributes from images and descriptions. Fill the gaps your competitors have not filled yet.",
  },
] as const;

export const Features = () => (
  <section className="relative -left-[calc(50vw-50%)] -z-1 w-screen border border-accent-foreground">
    <div className="relative mx-auto max-w-6xl p-6 md:p-12">
      <h1 className="font-body text-3xl text-foreground md:text-5xl">
        Infrastructure for the agent economy.
      </h1>
    </div>
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
      {features.map((feature, _index) => (
        <div
          key={feature.title}
          className="relative flex flex-col justify-end gap-2 bg-background-dimmed p-4 md:h-82"
        >
          <feature.icon className={cn(feature.color, "size-16")} />
          <h2 className="font-body font-medium text-2xl text-foreground md:text-4xl">
            {feature.title}
          </h2>
          <p className="font-body font-light text-foreground-dimmed text-lg">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  </section>
);
