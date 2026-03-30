"use client";

import { ArrowRightIcon, CheckIcon, XIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import Link from "next/link";

export type ProductDetailData = {
  product: {
    id: string;
    title: string;
    description: string | null;
    price: string | null;
    currency: string | null;
    sku: string | null;
    structuredData: string | null;
    quality: number;
  };
  winRate: number;
  models: Array<{
    model: string;
    label: string;
    rate: number;
    wins: number;
    losses: number;
    total: number;
  }>;
  competitors: Array<{
    id: string;
    title: string;
    brand: string | null;
    rate: number;
    wins: number;
    total: number;
  }>;
  simulations: Array<{
    id: string;
    model: string;
    winner: string;
    reasoning: string | null;
    productScore: number | null;
    competitorScore: number | null;
    competitorId: string;
    competitorTitle: string;
    createdAt: Date;
  }>;
};

const rateColor = (rate: number) => {
  switch (true) {
    case rate >= 60:
      return "text-success";
    case rate >= 30:
      return "text-warning";
    default:
      return "text-error";
  }
};

const barColor = (rate: number) => {
  switch (true) {
    case rate >= 60:
      return "bg-success";
    case rate >= 30:
      return "bg-warning";
    default:
      return "bg-error";
  }
};

const qualityFields = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "price", label: "Price" },
  { key: "sku", label: "SKU" },
  { key: "structuredData", label: "Structured Data" },
] as const;

export const ProductDetail = ({ data }: ProductDetail.Props) => {
  const { product, models, competitors, simulations } = data;

  return (
    <Tabs defaultValue="overview">
      <TabsList className="mb-4 h-auto border border-accent-foreground bg-transparent px-0">
        <TabsIndicator className="top-0 h-full translate-y-0 rounded-none" />
        <Tab value="overview">Win Rate</Tab>
        <Tab value="replay">Agent Replay</Tab>
        <Tab value="gaps">Data Gaps</Tab>
        <Tab value="battlecard">Battlecard</Tab>
        <Tab value="optimize">Optimize</Tab>
      </TabsList>

      <TabsPanel value="overview">
        <OverviewTab models={models} competitors={competitors} />
      </TabsPanel>

      <TabsPanel value="replay">
        <ReplayTab simulations={simulations} product={product} />
      </TabsPanel>

      <TabsPanel value="gaps">
        <GapsTab product={product} />
      </TabsPanel>

      <TabsPanel value="battlecard">
        <BattlecardTab
          product={product}
          competitors={competitors}
          simulations={simulations}
        />
      </TabsPanel>

      <TabsPanel value="optimize">
        <OptimizeTab product={product} />
      </TabsPanel>
    </Tabs>
  );
};
export namespace ProductDetail {
  export type Props = {
    data: ProductDetailData;
  };
}

const OverviewTab = ({
  models,
  competitors,
}: {
  models: ProductDetailData["models"];
  competitors: ProductDetailData["competitors"];
}) => (
  <>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {models.map(({ model, label, rate, wins, losses, total }) => (
        <div
          key={model}
          className="border border-accent-foreground bg-background-rich p-4"
        >
          <p className="mb-2 font-medium text-foreground text-sm">{label}</p>
          <p className={cn("font-semibold text-3xl", rateColor(rate))}>
            {rate}%
          </p>
          <div className="mt-2 h-1.5 w-full bg-accent-foreground">
            <div
              className={cn("h-full", barColor(rate))}
              style={{ width: `${rate}%` }}
            />
          </div>
          <p className="mt-1 font-light text-foreground-dimmed text-xs">
            {wins} wins · {losses} losses · {total} total
          </p>
        </div>
      ))}
    </div>

    {competitors.length > 0 && (
      <div className="mt-4 border border-accent-foreground bg-background-rich p-4">
        <p className="mb-3 font-medium text-foreground text-sm">
          Win rate vs. each competitor
        </p>
        {competitors.map(({ id, title, rate }) => (
          <div key={id} className="mb-2 flex items-center gap-3">
            <span className="w-32 truncate font-light text-foreground-dimmed text-xs">
              {title}
            </span>
            <div className="h-1.5 flex-1 bg-accent-foreground">
              <div
                className={cn("h-full", barColor(rate))}
                style={{ width: `${rate}%` }}
              />
            </div>
            <span className="w-8 text-right font-medium text-foreground text-xs">
              {rate}%
            </span>
          </div>
        ))}
      </div>
    )}
  </>
);

const ReplayTab = ({
  simulations,
  product,
}: {
  simulations: ProductDetailData["simulations"];
  product: ProductDetailData["product"];
}) => {
  if (simulations.length === 0)
    return (
      <div className="border border-accent-foreground bg-background-rich p-8 text-center">
        <p className="font-light text-foreground-dimmed text-sm">
          No simulations yet. Run a scan to see agent decision replays.
        </p>
      </div>
    );

  const grouped = ["gpt4", "claude", "gemini"].flatMap((modelId) => {
    const modelSimulations = simulations.filter(
      (simulation) => simulation.model === modelId,
    );
    if (modelSimulations.length === 0) return [];
    return [{ model: modelId, simulations: modelSimulations }];
  });

  return (
    <div className="space-y-4">
      {grouped.map(({ model, simulations: modelSimulations }) => (
        <div key={model} className="border border-accent-foreground">
          <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2">
            <p className="font-medium text-foreground text-sm">
              {model === "gpt4"
                ? "GPT-4"
                : model === "claude"
                  ? "Claude"
                  : "Gemini"}{" "}
              Decision Replay
            </p>
          </div>
          <div className="bg-foreground p-5 font-mono text-xs leading-relaxed">
            <p className="font-bold text-white">Evaluating: {product.title}</p>
            <div className="h-2" />
            {modelSimulations.map((simulation) => (
              <div key={simulation.id} className="mb-4">
                <p className="text-white/70">
                  → vs. {simulation.competitorTitle}
                </p>
                <p className="text-white/60">
                  Score: {simulation.productScore ?? "?"} vs{" "}
                  {simulation.competitorScore ?? "?"}
                </p>
                <p
                  className={cn(
                    "font-bold",
                    simulation.winner === "product"
                      ? "text-success"
                      : "text-warning",
                  )}
                >
                  DECISION:{" "}
                  {simulation.winner === "product"
                    ? product.title
                    : simulation.competitorTitle}
                </p>
                {simulation.reasoning && (
                  <p className="mt-1 text-white/60 leading-relaxed">
                    REASONING: &quot;{simulation.reasoning}&quot;
                  </p>
                )}
                <div className="h-2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const GapsTab = ({ product }: { product: ProductDetailData["product"] }) => (
  <div className="border border-accent-foreground bg-background-rich">
    <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2">
      <p className="font-light text-foreground-dimmed text-xs">
        Data quality:{" "}
        <span className="font-medium text-foreground">
          {product.quality}/100
        </span>
      </p>
    </div>
    <div className="divide-y divide-accent-foreground">
      {qualityFields.map(({ key, label }) => {
        const value = product[key];
        const filled = (() => {
          if (!value) return false;
          if (key === "structuredData") return value !== "null";
          return true;
        })();

        return (
          <div
            key={key}
            className={cn(
              "flex items-center justify-between px-4 py-3",
              !filled && "bg-error/5",
            )}
          >
            <div className="flex items-center gap-3">
              {filled ? (
                <CheckIcon className="size-4 text-success" />
              ) : (
                <XIcon className="size-4 text-error" />
              )}
              <span className="font-light text-foreground text-sm">
                {label}
              </span>
            </div>
            <span
              className={cn(
                "font-medium text-xs",
                filled ? "text-success" : "text-error",
              )}
            >
              {filled ? "Present" : "Missing"}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

const BattlecardTab = ({
  product,
  competitors,
  simulations,
}: {
  product: ProductDetailData["product"];
  competitors: ProductDetailData["competitors"];
  simulations: ProductDetailData["simulations"];
}) => {
  if (competitors.length === 0)
    return (
      <div className="border border-accent-foreground bg-background-rich p-8 text-center">
        <p className="font-light text-foreground-dimmed text-sm">
          No competitor data available. Run a scan to generate battlecards.
        </p>
      </div>
    );

  return (
    <div className="space-y-4">
      {competitors.map((competitor) => {
        const competitorSimulations = simulations.filter(
          (simulation) => simulation.competitorId === competitor.id,
        );
        const wins = competitorSimulations.filter(
          (simulation) => simulation.winner === "product",
        );
        const losses = competitorSimulations.filter(
          (simulation) => simulation.winner !== "product",
        );

        return (
          <div
            key={competitor.id}
            className="border border-accent-foreground bg-background-rich"
          >
            <div className="border-accent-foreground border-b px-4 py-3">
              <p className="font-medium text-foreground text-sm">
                {product.title} vs. {competitor.title}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-light text-foreground-dimmed text-xs">
                  Win rate:
                </span>
                <span
                  className={cn(
                    "font-semibold text-sm",
                    rateColor(competitor.rate),
                  )}
                >
                  {competitor.rate}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-0 divide-x divide-accent-foreground">
              <div className="p-4">
                <p className="mb-3 font-medium text-success text-xs uppercase tracking-wide">
                  You Win ({wins.length})
                </p>
                {wins.length > 0 ? (
                  wins.map((simulation) => (
                    <div
                      key={simulation.id}
                      className="mb-2 flex items-start gap-2"
                    >
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
                      <span className="font-light text-foreground text-xs leading-relaxed">
                        {simulation.reasoning
                          ? simulation.reasoning.slice(0, 120) +
                            (simulation.reasoning.length > 120 ? "…" : "")
                          : `Won with score ${simulation.productScore}`}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="font-light text-foreground-dimmed text-xs">
                    No wins recorded
                  </p>
                )}
              </div>
              <div className="p-4">
                <p className="mb-3 font-medium text-error text-xs uppercase tracking-wide">
                  They Win ({losses.length})
                </p>
                {losses.length > 0 ? (
                  losses.map((simulation) => (
                    <div
                      key={simulation.id}
                      className="mb-2 flex items-start gap-2"
                    >
                      <XIcon className="mt-0.5 size-4 shrink-0 text-error" />
                      <span className="font-light text-foreground text-xs leading-relaxed">
                        {simulation.reasoning
                          ? simulation.reasoning.slice(0, 120) +
                            (simulation.reasoning.length > 120 ? "…" : "")
                          : `Lost with score ${simulation.productScore}`}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="font-light text-foreground-dimmed text-xs">
                    No losses recorded
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const OptimizeTab = ({
  product,
}: {
  product: ProductDetailData["product"];
}) => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <div className="border border-accent-foreground bg-background-rich">
      <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2">
        <p className="font-medium text-foreground text-xs">Current Listing</p>
      </div>
      <div className="p-4">
        <p className="mb-1 font-medium text-foreground-dimmed text-xs uppercase tracking-wide">
          Title
        </p>
        <p className="font-light text-foreground text-sm">{product.title}</p>

        <p className="mt-4 mb-1 font-medium text-foreground-dimmed text-xs uppercase tracking-wide">
          Description
        </p>
        {product.description ? (
          <p className="font-light text-foreground text-sm leading-relaxed">
            {product.description.slice(0, 300)}
            {product.description.length > 300 ? "…" : ""}
          </p>
        ) : (
          <p className="font-light text-error text-xs italic">
            No description found
          </p>
        )}

        <p className="mt-4 mb-1 font-medium text-foreground-dimmed text-xs uppercase tracking-wide">
          Structured Data
        </p>
        {product.structuredData ? (
          <p className="bg-background-dimmed p-2 font-mono text-foreground-dimmed text-xs">
            {product.structuredData.slice(0, 200)}…
          </p>
        ) : (
          <p className="font-light text-error text-xs italic">
            No JSON-LD structured data found
          </p>
        )}
      </div>
    </div>

    <div className="border border-accent-foreground bg-background-rich">
      <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2">
        <p className="font-medium text-foreground text-xs">
          Data Quality: {product.quality}%
        </p>
      </div>
      <div className="p-4">
        <p className="mb-3 font-light text-foreground text-sm">
          Improve your listing data to increase win rates across all AI models.
        </p>
        <Link
          href="/dashboard/ucp"
          className="flex w-full items-center justify-center gap-2 bg-primary py-2 font-medium text-sm text-white transition-colors hover:bg-primary/90"
        >
          Generate Optimized Data
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    </div>
  </div>
);
