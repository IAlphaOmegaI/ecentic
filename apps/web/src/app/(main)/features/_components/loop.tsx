import type { Icon } from "@zenncore/icons";
import {
  CircleBoltIcon,
  FaceSearchIcon,
  RobotIcon,
  TrendUpIcon,
} from "@zenncore/icons";
import { Plus } from "@/components/plus";

type Step = {
  icon: Icon;
  step: string;
  title: string;
  description: string;
};

const steps: readonly Step[] = [
  {
    icon: RobotIcon,
    step: "Step 01",
    title: "Simulate",
    description:
      "ecentic asks the top AI shopping agents to shop your catalog against real competitors, the same way buyers do.",
  },
  {
    icon: FaceSearchIcon,
    step: "Step 02",
    title: "Diagnose",
    description:
      "See exactly which products agents skip, who they pick instead, and which missing attribute cost you the cart.",
  },
  {
    icon: CircleBoltIcon,
    step: "Step 03",
    title: "Optimize",
    description:
      "Approve rewritten titles, descriptions, and structured data, then publish them back to your store in one click.",
  },
  {
    icon: TrendUpIcon,
    step: "Step 04",
    title: "Track",
    description:
      "Watch your win rate, AI-agent visits, and attributed revenue climb week over week, then rescan and repeat.",
  },
] as const;

export const Loop = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">01</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          One loop from invisible to recommended.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          Visibility in AI-assisted shopping is not a brand metric. It is an
          operational loop, and ecentic runs all four steps for every product in
          your catalog.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2 lg:grid-cols-4">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        {steps.map((step) => (
          <div
            key={step.title}
            className="flex flex-col gap-2 bg-background-dimmed p-6 md:p-8"
          >
            <p className="font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em]">
              {step.step}
            </p>
            <step.icon className="mt-2 size-12 text-primary" />
            <h3 className="font-body font-medium text-2xl text-foreground">
              {step.title}
            </h3>
            <p className="font-body font-light text-foreground-dimmed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
