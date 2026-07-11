import type { Icon } from "@zenncore/icons";
import {
  CheckIcon,
  FaceSearchIcon,
  RobotIcon,
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
    icon: RobotIcon,
    step: "Step 01",
    title: "Simulate",
    description:
      "AI shopping evaluations run across your products and competitor listings, so the team sees who wins and why.",
  },
  {
    icon: FaceSearchIcon,
    step: "Step 02",
    title: "Diagnose",
    description:
      "Inspect attribute gaps and the reasons behind each selection: missing data, weak positioning, or incomplete product context.",
  },
  {
    icon: UploadIcon,
    step: "Step 03",
    title: "Publish",
    description:
      "Approved titles, descriptions, and product data push straight back into supported platforms instead of being copied by hand.",
  },
] as const;

const audiences = [
  "Improving product discovery without rewriting the whole catalog at once",
  "Catalogs with hundreds or thousands of SKUs and uneven data quality",
  "Categories won on specifications, compatibility, and merchant trust",
  "Teams that need a repeatable process for product content at scale",
] as const;

export const Workflow = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">03</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          A closed loop, not a one-off rewrite.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          The workflow runs from simulation to diagnosis to an approval-ready
          listing update, without rebuilding your catalog from scratch.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-3">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        {steps.map((step) => (
          <div
            key={step.title}
            className="flex flex-col gap-2 bg-background-rich p-6 md:p-8"
          >
            <p className="font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em]">
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
          Where this workflow pays off most
        </p>
        <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
          {audiences.map((audience) => (
            <li key={audience} className="flex items-start gap-2">
              <CheckIcon className="mt-1 size-4 shrink-0 text-primary" />
              <p className="font-body font-light text-foreground-dimmed">
                {audience}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);
