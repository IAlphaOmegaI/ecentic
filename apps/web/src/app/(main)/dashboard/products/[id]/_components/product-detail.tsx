"use client";

import { ArrowRightIcon, CheckIcon, XIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { ColumnDef } from "@zenncore/web/components/data-table";
import {
  DataTable,
  DataTableEmpty,
  DataTableProvider,
} from "@zenncore/web/components/data-table";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Spring } from "@/lib/animations";
import * as Optimization from "@/server/app/optimization";

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

const columns = [
  {
    accessorKey: "title",
    header: "Competitor",
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-foreground">{row.original.title}</p>
        {row.original.brand && (
          <p className="font-light text-foreground-dimmed">
            {row.original.brand}
          </p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "rate",
    header: "Win Rate",
    cell: ({ row }) => {
      const rate = row.original.rate;
      const color = (() => {
        switch (true) {
          case rate >= 60:
            return { bar: "bg-success", text: "text-success" };
          case rate >= 30:
            return { bar: "bg-warning", text: "text-warning" };
          default:
            return { bar: "bg-error", text: "text-error" };
        }
      })();
      return (
        <div className="flex items-center gap-2">
          <div className="h-1 w-20 bg-accent-foreground">
            <div
              className={cn("h-full", color.bar)}
              style={{ width: `${rate}%` }}
            />
          </div>
          <span className={cn("font-medium tabular-nums", color.text)}>
            {rate}%
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "wins",
    header: "Wins",
    cell: ({ row }) => (
      <span className="font-medium text-success tabular-nums">
        {row.original.wins}
      </span>
    ),
  },
  {
    accessorKey: "losses",
    header: "Losses",
    cell: ({ row }) => (
      <span className="font-medium text-error tabular-nums">
        {row.original.total - row.original.wins}
      </span>
    ),
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => (
      <span className="font-light text-foreground-dimmed tabular-nums">
        {row.original.total}
      </span>
    ),
  },
] satisfies ColumnDef<ProductDetailData["competitors"][number]>[];

const Model = {
  "GPT-4": {
    logo: "/images/chatgpt.svg",
  },
  Claude: {
    logo: "/images/claude.svg",
  },
  Gemini: {
    logo: "/images/gemini.svg",
  },
  Perplexity: {
    logo: "/images/perplexity.svg",
  },
} as const;

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
      <TabsList className="w-full border-none">
        <TabsIndicator className={"h-full"} />
        <Tab value="overview" className={"flex-1"}>
          Win Rate
        </Tab>
        <Tab value="replay" className={"flex-1"}>
          Agent Replay
        </Tab>
        <Tab value="gaps" className={"flex-1"}>
          Data Gaps
        </Tab>
        <Tab value="battlecard" className={"flex-1"}>
          Battlecard
        </Tab>
        <Tab value="optimize" className={"flex-1"}>
          Optimize
        </Tab>
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
    <div className="grid grid-cols-2 gap-px border-accent-foreground border-t bg-accent-foreground lg:grid-cols-4">
      {models.map(({ model, label, rate, wins, losses, total }) => {
        const config = Model[label as keyof typeof Model];
        return (
          <div
            key={model}
            className={cn("flex flex-col gap-4 p-4", "bg-background-dimmed")}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                {config?.logo && (
                  <Image
                    src={config.logo}
                    alt={label}
                    width={20}
                    height={20}
                    className="size-12"
                  />
                )}
                <span
                  className={cn(
                    "font-medium uppercase tracking-widest",
                    "text-foreground-dimmed",
                  )}
                >
                  {label}
                </span>
              </div>

              <div>
                <p
                  className={cn(
                    "font-semibold text-4xl tabular-nums",
                    rateColor(rate),
                  )}
                >
                  {rate}{" "}
                  <span className="font-light text-foreground-dimmed text-xl">
                    %
                  </span>
                </p>
                <p className="mt-0.5 font-light text-foreground-dimmed">
                  win rate
                </p>
              </div>
            </div>

            <div className="mt-auto space-y-1.5">
              <div className="h-1 w-full bg-accent-foreground">
                <motion.div
                  className={cn("h-full", barColor(rate))}
                  initial={{ width: 0 }}
                  animate={{ width: `${rate}%` }}
                  transition={{ ...Spring.Gentle, delay: 0.3 }}
                />
              </div>
              <div className="flex justify-between font-light text-foreground-dimmed">
                <span>
                  {wins} W · {losses} L
                </span>
                <span>{total} total</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
    <div className="border-accent-foreground border-y p-4" />
    <div className="mt-px">
      <div className="flex items-end justify-between border-accent-foreground border-b p-4">
        <p className="font-medium text-foreground text-xl">
          Win rate vs. each competitor
        </p>
        <Button
          variant="outline"
          color="accent"
          render={<Link href="/dashboard/competitors" />}
        >
          View All
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
      <DataTableProvider
        rows={competitors.map((row) => ({ _id: row.id, ...row }))}
        columns={columns}
        handler="client"
      >
        <DataTable className="border-b-0">
          <DataTableEmpty>
            <p className="p-6 text-center font-light text-foreground-dimmed text-sm">
              No competitors tracked yet.
            </p>
          </DataTableEmpty>
        </DataTable>
      </DataTableProvider>
    </div>
  </>
);

const replayModelLabel = (modelId: string) => {
  switch (modelId) {
    case "gpt4":
      return "GPT-4";
    case "claude":
      return "Claude";
    case "gemini":
      return "Gemini";
    case "perplexity":
      return "Perplexity";
    default:
      return modelId;
  }
};

const ReplayTab = ({
  simulations,
  product,
}: {
  simulations: ProductDetailData["simulations"];
  product: ProductDetailData["product"];
}) => {
  const grouped = ["gpt4", "claude", "gemini", "perplexity"].flatMap(
    (modelId) => {
      const modelSimulations = simulations.filter(
        (simulation) => simulation.model === modelId,
      );
      if (modelSimulations.length === 0) return [];
      return [
        {
          model: modelId,
          label: replayModelLabel(modelId),
          simulations: modelSimulations,
        },
      ];
    },
  );

  const [selected, setSelected] = useState(grouped[0]?.model ?? null);

  if (grouped.length === 0)
    return (
      <div className="border border-accent-foreground bg-background-rich p-8 text-center">
        <p className="font-light text-foreground-dimmed text-sm">
          No simulations yet. Run a scan to see agent decision replays.
        </p>
      </div>
    );

  const active = grouped.find((g) => g.model === selected) ?? grouped[0];

  return (
    <div className="flex border border-accent-foreground border-x-0">
      <div className="flex shrink-0 flex-col border-accent-foreground border-r">
        {grouped.map(({ model, label }) => {
          const config = Model[label as keyof typeof Model];
          const isSelected = model === selected;
          return (
            <button
              key={model}
              type="button"
              onClick={() => setSelected(model)}
              className={cn(
                "flex flex-col items-center gap-2 border-accent-foreground border-b px-4 py-5 transition-colors last:border-b-0",
                isSelected
                  ? "bg-background-rich"
                  : "bg-background-dimmed hover:bg-background-rich/60",
              )}
            >
              {config?.logo && (
                <Image
                  src={config.logo}
                  alt={label}
                  width={20}
                  height={20}
                  className={cn(
                    "size-8 transition-opacity",
                    !isSelected && "opacity-40",
                  )}
                />
              )}
              <span
                className={cn(
                  "font-medium text-sm uppercase leading-tight tracking-wide transition-colors",
                  isSelected ? "text-foreground" : "text-foreground-dimmed",
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {active && (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-accent-foreground border-b bg-background-dimmed px-4 py-2">
            {(() => {
              const logo = Model[active.label as keyof typeof Model]?.logo;
              return (
                logo && (
                  <Image
                    src={logo}
                    alt={active.label}
                    width={16}
                    height={16}
                    className="size-6"
                  />
                )
              );
            })()}
            <p className="font-medium text-foreground">
              {active.label} Decision Replay
            </p>
            <span className="ml-auto font-light text-foreground-dimmed text-xs">
              {active.simulations.length} simulation
              {active.simulations.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex-1 bg-foreground p-5 font-mono text-xs leading-relaxed">
            <p className="font-bold text-white">Evaluating: {product.title}</p>
            <div className="h-2" />
            {active.simulations.map((simulation) => (
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
      )}
    </div>
  );
};

const GapsTab = ({ product }: { product: ProductDetailData["product"] }) => (
  <>
    <div className="flex items-end justify-between border-accent-foreground border-y p-4">
      <p className="font-medium text-foreground text-xl">Data Gaps</p>
      <p className="font-light text-foreground-dimmed">
        Quality score:{" "}
        <span className={cn("font-semibold", rateColor(product.quality))}>
          {product.quality}
          <span className="font-light text-foreground-dimmed">/100</span>
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
              "flex items-center justify-between px-4 py-4",
              !filled && "bg-error/5",
            )}
          >
            <div className="flex items-center gap-3">
              {filled ? (
                <CheckIcon className="size-4 text-success" />
              ) : (
                <XIcon className="size-4 text-error" />
              )}
              <span className="font-medium text-foreground">{label}</span>
            </div>
            <span
              className={cn(
                "font-medium text-sm",
                filled ? "text-success" : "text-error",
              )}
            >
              {filled ? "Present" : "Missing"}
            </span>
          </div>
        );
      })}
    </div>
  </>
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
    <div className="space-y-px border-accent-foreground border-t bg-accent-foreground">
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
        const total = wins.length + losses.length;

        return (
          <div key={competitor.id} className="bg-background-rich">
            <div className="grid grid-cols-[1fr_auto] items-start gap-4 border-accent-foreground border-b bg-background-dimmed p-4">
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  {competitor.title}
                </p>
                <p className="mt-0.5 font-light text-foreground-dimmed">
                  vs. {product.title}
                </p>
                <div className="mt-4 flex w-full items-center gap-2">
                  <div className="h-1 flex-1 bg-accent-foreground">
                    <div
                      className={cn("h-full", barColor(competitor.rate))}
                      style={{ width: `${competitor.rate}%` }}
                    />
                  </div>
                  <span className="font-light text-foreground-dimmed tabular-nums">
                    {wins.length} W · {losses.length} L
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "font-semibold text-3xl tabular-nums leading-none",
                    rateColor(competitor.rate),
                  )}
                >
                  {competitor.rate}{" "}
                  <span className="font-light text-base text-foreground-dimmed">
                    %
                  </span>
                </p>
                <p className="mt-1 font-light text-foreground-dimmed text-xs">
                  {total} sim{total !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-accent-foreground">
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <CheckIcon className="size-4 text-success" />
                  <span className="font-medium text-foreground-dimmed text-lg uppercase tracking-widest">
                    Won · {wins.length}
                  </span>
                </div>
                {wins.length > 0 ? (
                  <div className="space-y-2">
                    {wins.map((simulation) => (
                      <p key={simulation.id} className="text-foreground">
                        -{" "}
                        {simulation.reasoning
                          ? simulation.reasoning.slice(0, 160) +
                            (simulation.reasoning.length > 160 ? "…" : "")
                          : `Won with score ${simulation.productScore}`}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="font-light text-foreground-dimmed text-xs italic">
                    No wins recorded
                  </p>
                )}
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <XIcon className="size-4 text-error" />
                  <span className="font-medium text-foreground-dimmed text-lg uppercase tracking-widest">
                    Lost · {losses.length}
                  </span>
                </div>
                {losses.length > 0 ? (
                  <div className="space-y-2">
                    {losses.map((simulation) => (
                      <p key={simulation.id} className="text-foreground">
                        -{" "}
                        {simulation.reasoning
                          ? simulation.reasoning.slice(0, 160) +
                            (simulation.reasoning.length > 160 ? "…" : "")
                          : `Lost with score ${simulation.productScore}`}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="font-light text-foreground-dimmed italic">
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
}) => {
  const [isPending, startTransition] = useTransition();
  const [liveStructuredData, setLiveStructuredData] = useState<string | null>(
    null,
  );

  const structuredData = liveStructuredData ?? product.structuredData;

  const handleGenerateJsonLd = () => {
    startTransition(async () => {
      const generation = await Optimization.generateStructuredData({ productId: product.id });
      if (generation.success) setLiveStructuredData(generation.data.structuredData);
    });
  };

  return (
    <>
      <div className="flex items-end justify-between border-accent-foreground border-y p-4">
        <p className="font-medium text-foreground text-xl">Optimize Listing</p>
        <p className="font-light text-foreground-dimmed">
          Quality:{" "}
          <span className={cn("font-semibold", rateColor(product.quality))}>
            {product.quality}
            <span className="font-light text-foreground-dimmed">/100</span>
          </span>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-px bg-accent-foreground lg:grid-cols-2">
        <div className="bg-background-rich p-6">
          <p className="mb-2 font-medium text-foreground-dimmed uppercase tracking-widest">
            Title
          </p>
          <p className="font-light text-foreground">{product.title}</p>

          <p className="mt-6 mb-2 font-medium text-foreground-dimmed uppercase tracking-widest">
            Description
          </p>
          {product.description ? (
            <div
              className="max-h-48 overflow-y-auto bg-background-dimmed p-3 font-light text-foreground text-sm leading-relaxed [&_ol]:mt-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_p+p]:mt-2 [&_ul]:mt-1 [&_ul]:list-disc [&_ul]:pl-4"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: product description is HTML sourced from the user's own store
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          ) : (
            <p className="font-light text-error text-sm italic">
              No description found
            </p>
          )}

          <p className="mt-6 mb-2 font-medium text-foreground-dimmed uppercase tracking-widest">
            Structured Data
          </p>
          {structuredData ? (
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap bg-background-dimmed p-3 font-mono text-foreground-dimmed text-xs leading-relaxed">
              {structuredData}
            </pre>
          ) : (
            <div className="space-y-3">
              <p className="font-light text-error text-sm italic">
                No JSON-LD structured data found
              </p>
              <Button
                type="button"
                variant="outline"
                color="accent"
                onClick={handleGenerateJsonLd}
                disabled={isPending}
              >
                {isPending ? "Generating…" : "Generate JSON-LD"}
                {!isPending && <ArrowRightIcon className="size-4" />}
              </Button>
            </div>
          )}
        </div>

        <div className="bg-background-rich p-6">
          <p className="mb-4 font-light text-foreground leading-relaxed">
            Improve your listing data to increase win rates across all AI
            models.
          </p>
          <Button
            variant="flat"
            color="primary"
            render={<Link href="/dashboard/ucp" />}
          >
            Generate Optimized Data
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
};
