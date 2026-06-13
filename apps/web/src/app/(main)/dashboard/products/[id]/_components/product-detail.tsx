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
import { Crosshair, SectionKicker, StatLabel } from "../../../_components/grid";

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
          <div className="h-1 w-20 rounded-full bg-accent-foreground">
            <div
              className={cn("h-full rounded-full", color.bar)}
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
      <TabsList className="w-full border-0">
        <TabsIndicator className="h-full" />
        <Tab value="overview" className="flex-1">
          Win Rate
        </Tab>
        <Tab value="replay" className="flex-1">
          Agent Replay
        </Tab>
        <Tab value="gaps" className="flex-1">
          Data Gaps
        </Tab>
        <Tab value="battlecard" className="flex-1">
          Battlecard
        </Tab>
        <Tab value="optimize" className="flex-1">
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
    <div className="p-4">
      <SectionKicker>01 — Performance</SectionKicker>
      <p className="mt-2 font-semibold text-foreground-rich text-lg">
        Win Rate by Model
      </p>
    </div>
    <div className="relative grid grid-cols-2 gap-px border-accent-foreground border-t bg-accent-foreground lg:grid-cols-4">
      <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      {models.map(({ model, label, rate, wins, losses, total }) => {
        const config = Model[label as keyof typeof Model];
        return (
          <div
            key={model}
            className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background"
          >
            <StatLabel
              label={label}
              icon={
                config?.logo && (
                  <Image
                    src={config.logo}
                    alt={label}
                    width={20}
                    height={20}
                    className="size-5 shrink-0"
                  />
                )
              }
            />
            <div>
              <p
                className={cn(
                  "font-bold text-4xl tabular-nums tracking-[-0.02em]",
                  rateColor(rate),
                )}
              >
                {rate}
                <span className="ml-0.5 font-medium text-foreground-dimmed text-xl">
                  %
                </span>
              </p>
              <div className="mt-3">
                <div className="h-1 w-full rounded-full bg-accent-foreground">
                  <motion.div
                    className={cn("h-full rounded-full", barColor(rate))}
                    initial={{ width: 0 }}
                    animate={{ width: `${rate}%` }}
                    transition={{ ...Spring.Gentle, delay: 0.3 }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-foreground-dimmed text-xs">
                  <span>
                    {wins} W · {losses} L
                  </span>
                  <span>{total} total</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
    <div className="relative flex items-end justify-between border-accent-foreground border-y p-4">
      <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Crosshair className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
      <div>
        <SectionKicker>02 — Competitive Landscape</SectionKicker>
        <p className="mt-2 font-semibold text-foreground-rich text-lg">
          Win rate vs. each competitor
        </p>
      </div>
      <Button color="primary" render={<Link href="/dashboard/competitors" />}>
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
      <div className="border-accent-foreground border-t bg-background-rich p-8 text-center">
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
                  : "bg-background-rich hover:bg-background",
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
                  "font-medium text-[10px] uppercase leading-tight tracking-[0.08em] transition-colors",
                  isSelected
                    ? "text-foreground-rich"
                    : "text-foreground-dimmed",
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {active && (
        <div className="flex min-w-0 flex-1 flex-col p-4">
          <div className="flex items-center gap-2 rounded-t-lg bg-emphasis-rich px-4 py-2">
            <p className="font-mono text-accent text-xs">
              {active.label} Decision Replay
            </p>
            <span className="ml-auto font-mono text-accent text-xs">
              {active.simulations.length} simulation
              {active.simulations.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex-1 rounded-b-lg bg-emphasis px-6 py-5 font-mono text-xs leading-relaxed">
            <p className="font-bold text-accent-foreground">
              Evaluating: {product.title}
            </p>
            <div className="h-2" />
            {active.simulations.map((simulation) => (
              <div key={simulation.id} className="mb-4">
                <p className="text-accent-rich">
                  → vs. {simulation.competitorTitle}
                </p>
                <p className="text-accent">
                  Score: {simulation.productScore ?? "?"} vs{" "}
                  {simulation.competitorScore ?? "?"}
                </p>
                <p
                  className={cn(
                    "font-bold",
                    simulation.winner === "product"
                      ? "text-success-rich"
                      : "text-warning-rich",
                  )}
                >
                  DECISION:{" "}
                  {simulation.winner === "product"
                    ? product.title
                    : simulation.competitorTitle}
                </p>
                {simulation.reasoning && (
                  <p className="mt-1 text-accent leading-relaxed">
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
    <div className="relative flex items-end justify-between border-accent-foreground border-y p-4">
      <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Crosshair className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
      <div>
        <SectionKicker>01 — Listing Health</SectionKicker>
        <p className="mt-2 font-semibold text-foreground-rich text-lg">
          Data Gaps
        </p>
      </div>
      <p className="text-foreground-dimmed text-sm">
        Quality score:{" "}
        <span className={cn("font-semibold", rateColor(product.quality))}>
          {product.quality}
          <span className="font-normal text-foreground-dimmed">/100</span>
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
            className="flex items-center justify-between bg-background-rich px-4 py-4 transition-colors hover:bg-background"
          >
            <div className="flex items-center gap-3">
              {filled ? (
                <CheckIcon className="size-6 text-success" />
              ) : (
                <XIcon className="size-6 text-error" />
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
      <div className="border-accent-foreground border-t bg-background-rich p-8 text-center">
        <p className="font-light text-foreground-dimmed text-sm">
          No competitor data available. Run a scan to generate battlecards.
        </p>
      </div>
    );

  return (
    <>
      <div className="relative flex items-end justify-between border-accent-foreground border-y p-4">
        <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Crosshair className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
        <div>
          <SectionKicker>01 — Battlecards</SectionKicker>
          <p className="mt-2 font-semibold text-foreground-rich text-lg">
            Head-to-Head Results
          </p>
        </div>
      </div>
      <div className="space-y-px bg-accent-foreground">
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
              <div className="grid grid-cols-[1fr_auto] items-start gap-4 border-accent-foreground border-b bg-background-rich p-4">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {competitor.title}
                  </p>
                  <p className="mt-0.5 font-light text-foreground-dimmed">
                    vs. {product.title}
                  </p>
                  <div className="mt-4 flex w-full items-center gap-2">
                    <div className="h-1 flex-1 rounded-full bg-accent-foreground">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          barColor(competitor.rate),
                        )}
                        style={{ width: `${competitor.rate}%` }}
                      />
                    </div>
                    <span className="text-foreground-dimmed text-xs tabular-nums">
                      {wins.length} W · {losses.length} L
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "font-bold text-3xl tabular-nums leading-none tracking-[-0.02em]",
                      rateColor(competitor.rate),
                    )}
                  >
                    {competitor.rate}{" "}
                    <span className="font-medium text-base text-foreground-dimmed">
                      %
                    </span>
                  </p>
                  <p className="mt-1 text-foreground-dimmed text-xs">
                    {total} sim{total !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-accent-foreground">
                <div className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckIcon className="size-6 text-success" />
                    <span className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
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
                    <XIcon className="size-6 text-error" />
                    <span className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
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
    </>
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
      const generation = await Optimization.generateStructuredData({
        product: product.id,
      });
      if (generation.success)
        setLiveStructuredData(generation.data.structuredData);
    });
  };

  return (
    <>
      <div className="relative flex items-end justify-between border-accent-foreground border-y p-4">
        <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Crosshair className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
        <div>
          <SectionKicker>01 — Optimization</SectionKicker>
          <p className="mt-2 font-semibold text-foreground-rich text-lg">
            Optimize Listing
          </p>
        </div>
        <p className="text-foreground-dimmed text-sm">
          Quality:{" "}
          <span className={cn("font-semibold", rateColor(product.quality))}>
            {product.quality}
            <span className="font-normal text-foreground-dimmed">/100</span>
          </span>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-px bg-accent-foreground lg:grid-cols-2">
        <div className="bg-background-rich p-6">
          <p className="mb-2 font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
            Title
          </p>
          <p className="text-foreground">{product.title}</p>

          <p className="mt-6 mb-2 font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
            Description
          </p>
          {product.description ? (
            <div
              className="max-h-48 overflow-y-auto rounded-md bg-background-dimmed p-3 text-foreground text-sm leading-relaxed [&_ol]:mt-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_p+p]:mt-2 [&_ul]:mt-1 [&_ul]:list-disc [&_ul]:pl-4"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: product description is HTML sourced from the user's own store
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          ) : (
            <p className="text-error text-sm italic">No description found</p>
          )}

          <p className="mt-6 mb-2 font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
            Structured Data
          </p>
          {structuredData ? (
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-background-dimmed p-3 font-mono text-foreground-dimmed text-xs leading-relaxed">
              {structuredData}
            </pre>
          ) : (
            <div className="space-y-3">
              <p className="text-error text-sm italic">
                No JSON-LD structured data found
              </p>
              <Button
                type="button"
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
          <p className="mb-4 text-foreground leading-relaxed">
            Improve your listing data to increase win rates across all AI
            models.
          </p>
          <Button color="primary" render={<Link href="/dashboard/ucp" />}>
            Generate Optimized Data
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
};
