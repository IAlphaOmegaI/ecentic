import {
  CheckBadgeIcon,
  ClockIcon,
  PhotoIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { cn, unwrapResult } from "@zenncore/utils";
import Image from "next/image";
import { connection } from "next/server";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import { Environment } from "@/server/utils/environment";
import { ScanRunner } from "./_components/scan-runner";

const models = [
  {
    model: "GPT-4",
    description: "Spec-focused",
    logo: "/images/chatgpt.svg",
  },
  {
    model: "Claude",
    description: "Contextual analysis",
    logo: "/images/claude.svg",
  },
  {
    model: "Gemini",
    description: "Price-quality ratio",
    logo: "/images/gemini.svg",
  },
] as const;

export default async () => {
  await connection();

  const [products, competitors] = await Promise.all([
    unwrapResult(Product.skimForCurrentUser(Environment.SERVER)),
    unwrapResult(Competitor.skimForCurrentUser(Environment.SERVER)),
  ]);

  const selected = competitors.filter((record) => record.selected);
  const simulations = products.length * selected.length * 3;

  const estimation = (() => {
    switch (true) {
      case simulations <= 30:
        return "~15 sec";
      case simulations <= 100:
        return "~90 sec";
      case simulations <= 300:
        return "~1 min";
      default:
        return "~2 min";
    }
  })();

  const labels = [
    {
      label: "Products",
      value: products.length.toLocaleString(),
      icon: PhotoIcon,
      color: "text-blue-500",
    },
    {
      label: "Competitors matched",
      value: selected.length.toLocaleString(),
      icon: CheckBadgeIcon,
      color: "text-orange-500",
    },
    {
      label: "Simulations to run",
      value: simulations.toLocaleString(),
      icon: SquareChartIcon,
      color: "text-green-500",
    },
    {
      label: "Estimated time",
      value: estimation,
      icon: ClockIcon,
      color: "text-red-500",
    },
  ] as const;

  return (
    <ScanRunner
      simulations={simulations}
      productCount={products.length}
      selectedCompetitorCount={selected.length}
    >
      <Motion.Stagger className="flex h-full flex-col overflow-y-auto border-accent-foreground border-b">
        <Motion.Item className="w-full border-accent-foreground border-b px-8">
          <div className="relative flex flex-col border-accent-foreground border-x p-6">
            <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <h2 className="font-medium text-4xl text-foreground">
              See who's winning.
            </h2>
            <p className="font-light text-2xl text-foreground-dimmed">
              GPT-4, Claude & Gemini will simulate real shopping queries across
              your products and competitors.
            </p>
          </div>
        </Motion.Item>

        <Motion.Item className="border-accent-foreground border-b px-8">
          <div className="relative grid grid-cols-3 divide-x divide-accent-foreground border-accent-foreground border-x">
            <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            {models.map((model) => (
              <div
                key={model.model}
                className="flex h-full flex-col bg-background-dimmed p-4"
              >
                <Image
                  src={model.logo}
                  alt={model.model}
                  width={48}
                  height={48}
                />
                <span className="mt-6 text-foreground text-xl">
                  {model.model}
                </span>
                <span className="font-light text-foreground-dimmed text-sm leading-tight">
                  {model.description}
                </span>
              </div>
            ))}
          </div>
        </Motion.Item>

        <Motion.Item className="h-12 w-full border-accent-foreground border-b px-8">
          <div className="flex flex-col border-accent-foreground border-x p-6" />
        </Motion.Item>

        <Motion.Item className="px-8">
          <div className="relative grid size-full max-h-full grid-cols-2 gap-px border-accent-foreground border-x bg-accent-foreground">
            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            {labels.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-background-dimmed p-4">
                <Icon className={cn("mb-6 size-12", color)} />
                <p className="font-medium text-2xl text-foreground">{value}</p>
                <p className="font-light text-foreground-dimmed">{label}</p>
              </div>
            ))}
          </div>
        </Motion.Item>

        {/* The Stagger fills its parent, so any space left under the stats grid
            is free space *inside* it — this filler carries border-x through it
            and keeps the rails unbroken down to the footer. min-h-0 collapses it
            to zero once the content is tall enough to scroll. */}
        <div className="min-h-0 flex-1 px-8">
          <div className="h-full border-accent-foreground border-x" />
        </div>
      </Motion.Stagger>
    </ScanRunner>
  );
};
