import { cn, unwrapResult } from "@zenncore/utils";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import { ScanRunner } from "./_components/scan-runner";
import { Motion } from "@/components/motion";

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
    <ScanRunner simulations={simulations}>
      <Motion.Item className="w-full border-accent-foreground border-b px-8">
        <div className="flex flex-col border-accent-foreground border-x p-6">
          <h2 className="font-medium text-4xl text-foreground">
            See who's winning.
          </h2>
          <p className="font-light text-2xl text-foreground-dimmed">
            GPT-4, Claude & Gemini will simulate real shopping queries across
            your products and competitors.
          </p>
        </div>
      </Motion.Item>

      <Motion.Item className="px-8  border-b border-accent-foreground">
        <div className="border-x border-accent-foreground grid grid-cols-3 divide-x divide-accent-foreground">
          {models.map((model) => (
            <div
              key={model.model}
              className="flex flex-col bg-background-dimmed p-4 aspect-square"
            >
              <span className={cn("font-semibold text-2xl", model.color)}>
                {model.model}
              </span>
              <span className="font-light text-foreground-dimmed">
                {model.desc}
              </span>
            </div>
          ))}
        </div>
      </Motion.Item>

      <Motion.Item className="w-full border-accent-foreground border-b px-8">
        <div className="flex flex-col border-accent-foreground border-x p-6">
          <h2 className="font-medium text-2xl text-foreground">
            Across your entire catalog
          </h2>
          <p className="font-light text-lg text-foreground-dimmed">
            We'll run simulations across your products and competitors.
          </p>
        </div>
      </Motion.Item>

      <Motion.Item className="px-8 flex-1 border-b border-accent-foreground">
        <div className="border-x border-accent-foreground grid grid-cols-2 gap-px">
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
        </div>
      </Motion.Item>
    </ScanRunner>
  );
};
