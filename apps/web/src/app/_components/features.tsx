import { CheckBadgeIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";

const features = [
  {
    icon: CheckBadgeIcon,
    color: "text-blue-500",
    title: "Agent Win Rate Dashboard",
    description:
      "See how often each product in your catalog is selected by AI agents vs. competitors, broken down by model (GPT, Claude, Gemini).",
  },
  {
    icon: CheckBadgeIcon,
    color: "text-green-500",
    title: "Multi-Model Engine",
    description:
      "We test every product across 5+ agent models, mapped to their unique selection biases.",
  },
  {
    icon: CheckBadgeIcon,
    color: "text-red-500",
    title: "Competitor Battlecards",
    description:
      "Know exactly which competitor products are beating yours, and on which specific attributes.",
  },
  {
    icon: CheckBadgeIcon,
    color: "text-purple-500",
    title: "UCP Readiness & Structured Data",
    description:
      "Generate your /.well-known/ ucp merchant profile. Extract attributes from images and descriptions to fill gaps your competitors don't have.",
  },
] as const;

export const Features = () => (
  <section className="relative relative -left-[calc(50vw-50%)] -z-1 w-screen border border-accent-foreground">
    <div className="broder relative mx-auto max-w-6xl border-accent-foreground p-6 md:p-12">
      <h1 className="font-body font-medium text-3xl text-primary-dimmed md:text-5xl">
        Infrastructure for the agent economy.
      </h1>
    </div>
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
      {features.map((feature, _index) => (
        <div
          key={feature.title}
          className="relative flex flex-col justify-end gap-2 bg-[#E8E8E8] p-4 md:h-82"
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
