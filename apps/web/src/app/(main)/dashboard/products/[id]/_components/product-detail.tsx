"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  CircleBoltIcon,
  TrendUpIcon,
  XIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@zenncore/web/components/alert-dialog";
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
import { useToastManager } from "@zenncore/web/components/toast";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Spring } from "@/lib/animations";
import * as Audit from "@/server/app/intelligence/audit";
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
  canPublish: boolean;
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

const PublishListing = ({
  product,
  winRate,
  canPublish,
  label = "Apply fix to store",
  className,
}: {
  product: ProductDetailData["product"];
  winRate: number;
  canPublish: boolean;
  label?: string;
  className?: string;
}) => {
  const router = useRouter();
  const toast = useToastManager();
  const [open, setOpen] = useState(false);

  const [publish, isPending] = useAsyncAction(async () => {
    const result = await Optimization.approveProductListing({
      product: product.id,
    });
    if (!result.success) {
      toast.add({
        title: "Publish failed",
        description: result.error.message,
        type: "error",
      });
      return;
    }
    toast.add({
      title: "Listing published",
      description: "An AI-optimized listing was pushed to your store.",
      type: "success",
    });
    setOpen(false);
    router.refresh();
  });

  return (
    <>
      <Button
        color="success"
        className={cn("shrink-0", className)}
        disabled={!canPublish}
        onClick={() => setOpen(true)}
      >
        <TrendUpIcon className="size-4" />
        {canPublish ? label : "Connect Shopify to apply"}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogPopup>
          <AlertDialogTitle>Publish optimized listing?</AlertDialogTitle>
          <AlertDialogDescription>
            Écentic generates an AI-optimized title and description for &ldquo;
            {product.title}&rdquo; and writes it directly to your connected
            store, replacing the live listing. Current win rate is {winRate}%.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              color="neutral"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              color="success"
              onClick={() => publish()}
              disabled={isPending}
            >
              {isPending ? "Publishing…" : "Publish to store"}
            </Button>
          </div>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
};

const ApplyOptimization = ({
  product,
  winRate,
  canPublish,
}: {
  product: ProductDetailData["product"];
  winRate: number;
  canPublish: boolean;
}) => (
  <div className="relative flex flex-col gap-4 border-accent-foreground border-b bg-emphasis p-5 sm:flex-row sm:items-center sm:justify-between">
    <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
    <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
    <div className="flex items-start gap-3">
      <CircleBoltIcon className="size-7 shrink-0 text-primary" />
      <div>
        <p className="font-semibold text-emphasis-foreground">
          Close the gap automatically
        </p>
        <p className="mt-1 max-w-prose text-emphasis-foreground text-sm leading-relaxed">
          Écentic rewrites this listing from the winning competitors&apos;
          strengths and publishes it straight to your store — no manual edits.
        </p>
      </div>
    </div>
    <PublishListing
      product={product}
      winRate={winRate}
      canPublish={canPublish}
    />
  </div>
);

export const ProductDetail = ({ data }: ProductDetail.Props) => {
  const { product, winRate, canPublish, models, competitors, simulations } =
    data;

  return (
    <Tabs defaultValue="overview">
      <TabsList className="w-full border-0 rounded-none">
        <TabsIndicator className="h-full" />
        <Tab value="overview" className="flex-1">
          Win Rate
        </Tab>
        <Tab value="replay" className="flex-1">
          Agent Replay
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

      <TabsPanel value="battlecard">
        <BattlecardTab
          product={product}
          winRate={winRate}
          canPublish={canPublish}
          competitors={competitors}
          simulations={simulations}
        />
      </TabsPanel>

      <TabsPanel value="optimize">
        <OptimizeTab
          product={product}
          winRate={winRate}
          canPublish={canPublish}
        />
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
  <section className="border-accent-foreground border-t">
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
  </section>
);

const replayModelLabel = (modelId: string) => {
  switch (modelId) {
    case "gpt4":
      return "GPT-4";
    case "claude":
      return "Claude";
    case "gemini":
      return "Gemini";
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
  const grouped = ["gpt4", "claude", "gemini"].flatMap((modelId) => {
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
  });

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

const ListingCompleteness = ({
  product,
}: {
  product: ProductDetailData["product"];
}) => (
  <div className="divide-y divide-accent-foreground border-accent-foreground border-b">
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
);

const auditFieldLabels: Record<string, string> = {
  title: "Title",
  description: "Description",
  price: "Price",
  sku: "SKU",
  structuredData: "Structured Data",
  images: "Images",
};

const AuditSkeleton = () => (
  <div className="divide-y divide-accent-foreground border-accent-foreground border-b">
    {Object.keys(auditFieldLabels).map((key) => (
      <div
        key={key}
        className="flex items-center justify-between bg-background-rich px-4 py-4"
      >
        <div className="h-4 w-40 animate-pulse bg-foreground/10" />
        <div className="h-2 w-32 animate-pulse rounded-full bg-foreground/10" />
      </div>
    ))}
  </div>
);

const ListingAudit = ({
  product,
}: {
  product: ProductDetailData["product"];
}) => {
  const [audit, setAudit] = useState<Audit.Type | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let active = true;
    setStatus("loading");

    void (async () => {
      const result = await Audit.auditProduct({ product: product.id });
      if (!active) return;
      if (!result.success) {
        setStatus("error");
        return;
      }
      setAudit(result.data);
      setStatus("ready");
    })();

    return () => {
      active = false;
    };
  }, [product.id]);

  // Fall back to the deterministic completeness checklist if the audit fails.
  if (status === "error") return <ListingCompleteness product={product} />;
  if (status === "loading" || !audit) return <AuditSkeleton />;

  return (
    <>
      <div className="flex items-center justify-between border-accent-foreground border-b bg-background-rich px-4 py-3">
        <SectionKicker>AI Content Quality</SectionKicker>
        <p
          className={cn(
            "font-bold text-2xl tabular-nums tracking-[-0.02em]",
            rateColor(audit.overall),
          )}
        >
          {audit.overall}
          <span className="font-medium text-foreground-dimmed text-sm">
            /100
          </span>
        </p>
      </div>

      <div className="border-accent-foreground border-b bg-background-rich p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <SectionKicker>Brand Positioning</SectionKicker>
            <p className="mt-1 font-medium text-foreground">
              {audit.positioning.audience}
            </p>
            <p className="text-foreground-dimmed text-sm">
              {audit.positioning.position}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className={cn(
                "font-bold text-3xl tabular-nums tracking-[-0.02em]",
                rateColor(audit.positioning.score),
              )}
            >
              {audit.positioning.score}
              <span className="font-medium text-foreground-dimmed text-base">
                /100
              </span>
            </p>
            <p className="text-foreground-dimmed text-xs">positioning</p>
          </div>
        </div>
        <p className="mt-3 text-foreground-dimmed text-sm leading-relaxed">
          {audit.positioning.reasoning}
        </p>
        <p className="mt-2 text-primary text-sm leading-relaxed">
          → {audit.positioning.suggestion}
        </p>
      </div>

      <div className="divide-y divide-accent-foreground border-accent-foreground border-b">
        {audit.fields.map((field) => (
          <div
            key={field.key}
            className="flex flex-col gap-2 bg-background-rich px-4 py-4 transition-colors hover:bg-background sm:flex-row sm:items-center sm:justify-between sm:gap-6"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-foreground">
                  {auditFieldLabels[field.key] ?? field.key}
                </span>
                <span className="truncate text-foreground-dimmed text-xs">
                  {field.verdict}
                </span>
              </div>
              <p className="mt-1 text-foreground-dimmed text-sm leading-relaxed">
                → {field.suggestion}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 sm:w-44">
              <div className="h-1.5 flex-1 rounded-full bg-accent-foreground">
                <div
                  className={cn("h-full rounded-full", barColor(field.score))}
                  style={{ width: `${field.score}%` }}
                />
              </div>
              <span
                className={cn(
                  "w-10 text-right font-semibold text-sm tabular-nums",
                  rateColor(field.score),
                )}
              >
                {field.score}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

const BattlecardTab = ({
  product,
  winRate,
  canPublish,
  competitors,
  simulations,
}: {
  product: ProductDetailData["product"];
  winRate: number;
  canPublish: boolean;
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
      <ApplyOptimization
        product={product}
        winRate={winRate}
        canPublish={canPublish}
      />
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
  winRate,
  canPublish,
}: {
  product: ProductDetailData["product"];
  winRate: number;
  canPublish: boolean;
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
          Completeness:{" "}
          <span className={cn("font-semibold", rateColor(product.quality))}>
            {product.quality}
            <span className="font-normal text-foreground-dimmed">/100</span>
          </span>
        </p>
      </div>
      <div className="bg-background-rich p-4">
        <SectionKicker>AI Listing Audit</SectionKicker>
        <p className="mt-1 text-foreground-dimmed text-sm">
          Category-aware content-quality scores for the fields AI agents read —
          plus how this listing is positioned for its audience.
        </p>
      </div>
      <ListingAudit product={product} />
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

        <div className="flex flex-col items-start gap-4 bg-background-rich p-6">
          <p className="text-foreground leading-relaxed">
            Let Écentic rewrite this listing and publish the optimized version
            straight to your store, or review every pending change in the
            optimization queue first.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <PublishListing
              product={product}
              winRate={winRate}
              canPublish={canPublish}
              label="Optimize & publish"
            />
            <Button
              variant="outline"
              color="neutral"
              render={<Link href="/dashboard/optimize" />}
            >
              Review queue
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
