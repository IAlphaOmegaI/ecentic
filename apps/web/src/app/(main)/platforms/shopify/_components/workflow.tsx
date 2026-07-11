import type { Icon } from "@zenncore/icons";
import {
  BullseyeIcon,
  CheckIcon,
  FaceSearchIcon,
  ShoppingCartIcon,
  UploadIcon,
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
    icon: ShoppingCartIcon,
    step: "Step 01",
    title: "Connect & import",
    description:
      "Install from the Shopify App Store and your catalog imports during onboarding, no theme edits required.",
  },
  {
    icon: BullseyeIcon,
    step: "Step 02",
    title: "Choose products",
    description:
      "Pick which items enter the optimization and simulation loop, from one hero product to the whole catalog.",
  },
  {
    icon: FaceSearchIcon,
    step: "Step 03",
    title: "Benchmark & diagnose",
    description:
      "Selected products are compared against competitors so you see where AI systems prefer another option, and why.",
  },
  {
    icon: UploadIcon,
    step: "Step 04",
    title: "Approve & write back",
    description:
      "Review the stronger version of each listing and publish approved changes back to Shopify through the Admin API.",
  },
] as const;

const outcomes = [
  "A cleaner way to prioritize which products need attention first",
  "Better visibility into why product pages lose to specific competitors",
  "Faster review of listing updates before they go live",
  "A publishing path that fits the existing Shopify catalog workflow",
] as const;

export const Workflow = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">02</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          The Shopify workflow in ecentic.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          The workflow connects the catalog, surfaces competitive gaps, and
          makes improvements publishable back into Shopify instead of one more
          disconnected document.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2 lg:grid-cols-4">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        {steps.map((step) => (
          <div
            key={step.title}
            className="flex flex-col gap-2 bg-background-dimmed p-6 md:min-h-80 md:justify-end md:p-8"
          >
            <p className="font-medium text-[#5E8E3E] text-sm uppercase tracking-[0.18em]">
              {step.step}
            </p>
            <step.icon className="mt-2 size-8 text-primary" />
            <h3 className="font-body font-medium text-2xl text-foreground">
              {step.title}
            </h3>
            <p className="font-body font-light text-foreground-dimmed">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      <div className="border-accent-foreground border-t p-6 md:p-8">
        <p className="font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em]">
          What Shopify teams get out of it
        </p>
        <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
          {outcomes.map((outcome) => (
            <li key={outcome} className="flex items-start gap-2">
              <CheckIcon className="mt-1 size-4 shrink-0 text-primary" />
              <p className="font-body font-light text-foreground-dimmed">
                {outcome}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);
