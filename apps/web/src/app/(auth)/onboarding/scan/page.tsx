import { cn, unwrapResult } from "@zenncore/utils";
import { Motion } from "@/components/motion";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import { ScanRunner } from "./_components/scan-runner";

const models = [
  { model: "GPT-4", color: "text-blue-500", desc: "Spec-focused reasoning" },
  { model: "Claude", color: "text-orange-500", desc: "Contextual analysis" },
  { model: "Gemini", color: "text-green-500", desc: "Price-quality ratio" },
] as const;

export default async () => {
  const [products, competitors] = await Promise.all([
    unwrapResult(Product.getForCurrentUser()),
    unwrapResult(Competitor.getForCurrentUser()),
  ]);

  const selected = competitors.filter((record) => record.selected);

  const simulations = products.length * selected.length * 3;

  const estimation = (() => {
    switch (true) {
      case simulations <= 30:
        return "~15 sec";
      case simulations <= 100:
        return "~30 sec";
      case simulations <= 300:
        return "~1 min";
      default:
        return "~2 min";
    }
  })();

  return (
    <ScanRunner totalSimulations={simulations}>
      <Motion.Stagger stagger={0.08} className="w-full max-w-2xl">
        <Motion.Up className="mb-10 text-center">
          <h1 className="font-medium text-4xl text-foreground leading-tight">
            See who's winning.
          </h1>
          <p className="mx-auto mt-3 max-w-md font-light text-base text-foreground-dimmed">
            GPT-4, Claude & Gemini will simulate real shopping queries across
            your products and competitors.
          </p>
        </Motion.Up>

        <Motion.Up className="mb-8 grid grid-cols-3 gap-px border border-accent-foreground bg-accent-foreground">
          {models.map((model) => (
            <div
              key={model.model}
              className="flex flex-col gap-1 bg-background-rich p-5"
            >
              <span className={cn("font-semibold text-xl", model.color)}>
                {model.model}
              </span>
              <span className="font-light text-foreground-dimmed text-xs">
                {model.desc}
              </span>
            </div>
          ))}
        </Motion.Up>

        <Motion.Up className="mb-8 grid grid-cols-2 gap-px border border-accent-foreground bg-accent-foreground">
          {[
            { label: "Products", value: products.length.toLocaleString() },
            {
              label: "Competitors matched",
              value: selected.length.toLocaleString(),
            },
            {
              label: "Simulations to run",
              value: simulations.toLocaleString(),
            },
            { label: "Estimated time", value: estimation },
          ].map((item) => (
            <div key={item.label} className="bg-background-rich px-5 py-4">
              <p className="font-semibold text-2xl text-foreground">
                {item.value}
              </p>
              <p className="font-light text-foreground-dimmed text-xs">
                {item.label}
              </p>
            </div>
          ))}
        </Motion.Up>
      </Motion.Stagger>
    </ScanRunner>
  );
};
