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
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@zenncore/web/components/alert-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@zenncore/web/components/avatar";
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
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Spring } from "@/lib/animations";
import * as Audit from "@/server/app/intelligence/audit";
import * as Optimization from "@/server/app/optimization";
import { renderInline } from "../../../../../_components/rich-text";
import {
  Crosshair,
  SectionKicker,
  StatLabel,
  StatusPill,
} from "../../../../_components/grid";
import { FindOffers } from "./find-offers";

export type ProductDetailData = {
  product: {
    id: string;
    title: string;
    description: string | null;
    price: string | null;
    currency: string | null;
    sku: string | null;
    structuredData: string | null;
    /** Single live verdict for the product page's structured data. */
    structuredDataStatus:
      | "ecentic-optimized"
      | "ecentic-standard"
      | "store-default"
      | "ecentic-optimized_embed-off"
      | "missing"
      | "unreachable";
    quality: number;
  };
  winRate: number;
  canPublish: boolean;
  /** Deep link that pre-activates the app embed in the theme editor. */
  themeEditorUrl: string | null;
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
    image: string | null;
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

const columns = (
  table: ReturnType<typeof useTranslations<"dashboard.shared.table">>,
) =>
  [
    {
      accessorKey: "title",
      header: table("competitor"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="size-9 shrink-0 rounded-md bg-background-dimmed">
            <AvatarImage
              src={row.original.image ?? "/images/fallback.png"}
              alt={row.original.title}
            />
            <AvatarFallback className="relative">
              <Image src="/images/fallback.png" alt="Fallback" fill />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{row.original.title}</p>
            {row.original.brand && (
              <p className="font-light text-foreground-dimmed">
                {row.original.brand}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "rate",
      header: table("winRate"),
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
      header: table("wins"),
      cell: ({ row }) => (
        <span className="font-medium text-success tabular-nums">
          {row.original.wins}
        </span>
      ),
    },
    {
      accessorKey: "losses",
      header: table("losses"),
      cell: ({ row }) => (
        <span className="font-medium text-error tabular-nums">
          {row.original.total - row.original.wins}
        </span>
      ),
    },
    {
      accessorKey: "total",
      header: table("total"),
      cell: ({ row }) => (
        <span className="font-light text-foreground-dimmed tabular-nums">
          {row.original.total}
        </span>
      ),
    },
    // DataTableProvider adds `_id` to each row, so the columns must be typed for
    // that row shape — not the bare competitor — or ColumnDef won't line up.
  ] satisfies ColumnDef<
    ProductDetailData["competitors"][number] & { _id: string }
  >[];

const qualityFields = (
  fields: ReturnType<
    typeof useTranslations<"dashboard.products.detail.fields">
  >,
) =>
  [
    { key: "title", label: fields("title") },
    { key: "description", label: fields("description") },
    { key: "price", label: fields("price") },
    { key: "sku", label: fields("sku") },
    { key: "structuredData", label: fields("structuredData") },
  ] as const;

const Model = {
  ChatGPT: {
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
  const translate = useTranslations("dashboard.products.detail.publish");
  const shared = useTranslations("dashboard.shared");
  const router = useRouter();
  const toast = useToastManager();
  const [open, setOpen] = useState(false);
  const defaultLabel = translate("applyFix");

  const [publish, isPending] = useAsyncAction(async () => {
    const result = await Optimization.approveProductListing({
      product: product.id,
    });
    if (!result.success) {
      toast.add({
        title: translate("failed"),
        description: result.error.message,
        type: "error",
      });
      return;
    }
    toast.add({
      title: translate("successTitle"),
      description: translate("successDescription"),
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
        {canPublish ? (label ?? defaultLabel) : translate("connectStore")}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogPopup>
          <AlertDialogTitle>{translate("dialogTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {translate("dialogDescription", {
              title: product.title,
              winRate,
            })}
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              color="neutral"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              {shared("cancel")}
            </Button>
            <Button
              color="success"
              onClick={() => publish()}
              disabled={isPending}
            >
              {isPending
                ? translate("publishing")
                : translate("publishToStore")}
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
  publishLabel,
  reviewQueueHref,
}: {
  product: ProductDetailData["product"];
  winRate: number;
  canPublish: boolean;
  publishLabel?: string;
  reviewQueueHref?: string;
}) => {
  const translate = useTranslations(
    "dashboard.products.detail.applyOptimization",
  );

  return (
    <div className="relative flex flex-col gap-4 border-accent-foreground border-b bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
      <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <div className="flex items-start gap-3">
        <CircleBoltIcon className="size-7 shrink-0 text-primary" />
        <div>
          <p className="font-semibold text-foreground-rich">
            {translate("title")}
          </p>
          <p className="mt-1 max-w-prose text-foreground-dimmed text-sm leading-relaxed">
            {translate("description")}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <PublishListing
          product={product}
          winRate={winRate}
          canPublish={canPublish}
          label={publishLabel}
        />
        {reviewQueueHref && (
          <Button
            // color="neutral" draws a blue-gray border (the neutral token is a
            // cool/blue gray) — "accent" is the plain grid-gray outline.
            variant="outline"
            color="accent"
            render={<Link href={reviewQueueHref} />}
          >
            {translate("reviewQueue")}
            <ArrowRightIcon className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export const ProductDetail = ({ data }: ProductDetail.Props) => {
  const { store } = useParams<{ store: string }>();
  const translate = useTranslations("dashboard.products.detail");
  const {
    product,
    winRate,
    canPublish,
    themeEditorUrl,
    models,
    competitors,
    simulations,
  } = data;

  return (
    <Tabs defaultValue="overview">
      {/* The list's p-1 leaves a 32px content box, so tabs must be h-8 — the
          Tab base is h-9 and was overflowing (clipped) and sitting off-centre
          from the indicator. border-r-0 drops the base divider lines, which
          don't belong in a segmented control. */}
      <TabsList className="h-10 w-full rounded-md border-0 bg-background-dimmed p-1">
        <TabsIndicator className="top-1 h-8 rounded" />
        <Tab value="overview" className="h-8 flex-1 border-r-0">
          {translate("tabs.winRate")}
        </Tab>
        <Tab value="replay" className="h-8 flex-1 border-r-0">
          {translate("tabs.agentReplay")}
        </Tab>
        <Tab value="battlecard" className="h-8 flex-1 border-r-0">
          {translate("tabs.battlecard")}
        </Tab>
        <Tab value="optimize" className="h-8 flex-1 border-r-0">
          {translate("tabs.optimize")}
        </Tab>
      </TabsList>

      <TabsPanel value="overview">
        <OverviewTab
          store={store}
          product={product.id}
          models={models}
          competitors={competitors}
        />
      </TabsPanel>

      <TabsPanel value="replay">
        <ReplayTab simulations={simulations} />
      </TabsPanel>

      <TabsPanel value="battlecard">
        <BattlecardTab
          store={store}
          product={product}
          winRate={winRate}
          canPublish={canPublish}
          competitors={competitors}
          simulations={simulations}
        />
      </TabsPanel>

      <TabsPanel value="optimize">
        <OptimizeTab
          store={store}
          product={product}
          winRate={winRate}
          canPublish={canPublish}
          themeEditorUrl={themeEditorUrl}
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
  store,
  product,
  models,
  competitors,
}: {
  store: string;
  /** Needed only so the empty state can offer to go and find rivals. */
  product: string;
  models: ProductDetailData["models"];
  competitors: ProductDetailData["competitors"];
}) => {
  const translate = useTranslations("dashboard.products.detail.overview");
  const shared = useTranslations("dashboard.shared");
  const table = useTranslations("dashboard.shared.table");
  const competitorColumns = useMemo(() => columns(table), [table]);

  return (
    <section className="border-accent-foreground border-t">
      <div className="p-4">
        <SectionKicker>{shared("sections.performance")}</SectionKicker>
        <p className="mt-2 font-semibold text-foreground-rich text-lg">
          {shared("performance.winRateByModel")}
        </p>
      </div>
      {/* Size to the model count — a fixed 4-col grid left a phantom empty cell
        with only 3 models. */}
      <div
        className="relative grid gap-px border-accent-foreground border-t bg-accent-foreground"
        style={{
          gridTemplateColumns: `repeat(${models.length}, minmax(0, 1fr))`,
        }}
      >
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
                    <span>{translate("wLTotal", { wins, losses })}</span>
                    <span>{translate("totalCount", { count: total })}</span>
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
        <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div>
          <SectionKicker>
            {shared("sections.competitiveLandscape")}
          </SectionKicker>
          <p className="mt-2 font-semibold text-foreground-rich text-lg">
            {translate("winRateVsCompetitor")}
          </p>
        </div>
        <Button
          color="primary"
          render={<Link href={`/dashboard/${store}/competitors`} />}
        >
          {translate("viewAll")}
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
      <DataTableProvider
        rows={competitors.map((row) => ({ _id: row.id, ...row }))}
        columns={competitorColumns}
        handler="client"
      >
        <DataTable className="border-b-0">
          <DataTableEmpty>
            <div className="flex flex-col items-center gap-3 p-6">
              <p className="text-center font-light text-foreground-dimmed text-sm">
                {translate("noCompetitors")}
              </p>
              <FindOffers store={store} product={product} />
            </div>
          </DataTableEmpty>
        </DataTable>
      </DataTableProvider>
    </section>
  );
};

const replayModelLabel = (modelId: string) => {
  switch (modelId) {
    case "gpt4":
      return "ChatGPT";
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
}: {
  simulations: ProductDetailData["simulations"];
}) => {
  const translate = useTranslations("dashboard.products.detail.replay");
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
          {translate("empty")}
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
                // Selected state was bg-background-rich on bg-background-rich —
                // invisible. Now a primary tint + left accent, and the logos
                // stay full-colour (they were dimmed to 40% = gray on gray).
                "flex flex-col items-center gap-2 border-accent-foreground border-b border-l-2 px-4 py-5 transition-colors last:border-b-0",
                isSelected
                  ? "border-l-primary bg-primary/5"
                  : "border-l-transparent bg-background-rich hover:bg-background-dimmed",
              )}
            >
              {config?.logo && (
                <Image
                  src={config.logo}
                  alt={label}
                  width={20}
                  height={20}
                  className="size-8"
                />
              )}
              <span
                className={cn(
                  "font-medium text-[10px] uppercase leading-tight tracking-[0.08em] transition-colors",
                  isSelected ? "text-primary" : "text-foreground-dimmed",
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
          {/* Was a monospace terminal wall with raw **markdown**. Each matchup
              is now a scannable row (competitor · score · verdict); the
              reasoning collapses and renders its bold markup as real prose. */}
          <div className="flex items-center justify-between gap-2 border-accent-foreground border-b bg-background-rich px-4 py-2.5">
            <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
              {translate("decisionReplay", { model: active.label })}
            </p>
            <span className="text-foreground-dimmed text-xs tabular-nums">
              {translate("simulationCount", {
                count: active.simulations.length,
              })}
            </span>
          </div>

          <Accordion
            className="text-foreground"
            // Losses are the actionable matchups — auto-open the first couple.
            defaultValue={active.simulations
              .filter((simulation) => simulation.winner !== "product")
              .slice(0, 2)
              .map((simulation) => simulation.id)}
          >
            {active.simulations.map((simulation) => {
              const won = simulation.winner === "product";
              return (
                <AccordionItem
                  key={simulation.id}
                  value={simulation.id}
                  className="border-accent-foreground border-b bg-background-rich"
                >
                  <AccordionTrigger
                    className="items-center px-4 py-3 hover:bg-background-dimmed/40"
                    classList={{
                      trigger: {
                        icon: "size-4 shrink-0 text-foreground-dimmed group-data-panel-open:rotate-180",
                      },
                    }}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                        {translate("vsCompetitor", {
                          title: simulation.competitorTitle,
                        })}
                      </span>
                      <span className="shrink-0 font-mono text-foreground-dimmed text-xs tabular-nums">
                        {simulation.productScore ?? "?"} —{" "}
                        {simulation.competitorScore ?? "?"}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 font-semibold text-[10px] uppercase tracking-[0.06em]",
                          won
                            ? "bg-success/10 text-success"
                            : "bg-error/10 text-error",
                        )}
                      >
                        {won ? translate("won") : translate("lost")}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionPanel>
                    <div className="border-accent-foreground border-t px-4 py-4">
                      <p className="mb-2 font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                        {translate("reasoning", { model: active.label })}
                      </p>
                      {simulation.reasoning ? (
                        <p className="text-foreground text-sm leading-relaxed">
                          {renderInline(simulation.reasoning, {
                            strongClassName:
                              "font-semibold text-foreground-rich",
                          })}
                        </p>
                      ) : (
                        <p className="text-foreground-dimmed text-sm italic">
                          {translate("noReasoning", {
                            productScore: simulation.productScore ?? "?",
                            competitorScore: simulation.competitorScore ?? "?",
                          })}
                        </p>
                      )}
                    </div>
                  </AccordionPanel>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}
    </div>
  );
};

const ListingCompleteness = ({
  product,
}: {
  product: ProductDetailData["product"];
}) => {
  const fields = useTranslations("dashboard.products.detail.fields");
  const shared = useTranslations("dashboard.shared");

  return (
    <div className="divide-y divide-accent-foreground border-accent-foreground border-b">
      {qualityFields(fields).map(({ key, label }) => {
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
              {filled ? shared("present") : shared("missing")}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const auditFieldKeys = [
  "title",
  "description",
  "price",
  "sku",
  "structuredData",
  "images",
] as const;

const AuditSkeleton = () => (
  <div className="divide-y divide-accent-foreground border-accent-foreground border-b">
    {auditFieldKeys.map((key) => (
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
  const auditCopy = useTranslations("dashboard.products.detail.audit");
  const fields = useTranslations("dashboard.products.detail.fields");
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
        <SectionKicker>{auditCopy("aiContentQuality")}</SectionKicker>
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
            <SectionKicker>{auditCopy("brandPositioning")}</SectionKicker>
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
              <span className="font-medium text-base text-foreground-dimmed">
                /100
              </span>
            </p>
            <p className="text-foreground-dimmed text-xs">
              {auditCopy("positioning")}
            </p>
          </div>
        </div>
        <p className="mt-3 text-foreground-dimmed text-sm leading-relaxed">
          {audit.positioning.reasoning}
        </p>
        <p className="mt-2 text-primary-text text-sm leading-relaxed">
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
                  {fields(
                    field.key as
                      | "title"
                      | "description"
                      | "price"
                      | "sku"
                      | "structuredData"
                      | "images",
                  )}
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

// Won/Lost rendered identically apart from tone, so it lives in one place.
const Outcome = ({
  tone,
  label,
  simulations,
  emptyLabel,
}: {
  tone: "success" | "error";
  label: string;
  simulations: ProductDetailData["simulations"];
  emptyLabel: string;
}) => (
  <div
    className={cn(
      "p-5",
      tone === "success" ? "bg-success/[0.04]" : "bg-error/[0.04]",
    )}
  >
    <div className="mb-3 flex items-center gap-2">
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          tone === "success" ? "bg-success" : "bg-error",
        )}
      />
      <span
        className={cn(
          "font-semibold text-xs uppercase tracking-[0.08em]",
          tone === "success" ? "text-success" : "text-error",
        )}
      >
        {label} · {simulations.length}
      </span>
    </div>
    {simulations.length > 0 ? (
      <ol className="space-y-3">
        {simulations.map((simulation, index) => (
          <li key={simulation.id} className="flex gap-3">
            {/* Numbered in mono, reusing SectionKicker's index motif — reads as
                a findings list rather than a tinted left rule. Preflight strips
                the native list marker, so this is the only number rendered. */}
            <span
              className={cn(
                "shrink-0 font-mono font-semibold text-xs tabular-nums leading-relaxed",
                tone === "success" ? "text-success" : "text-error",
              )}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            {/* line-clamp beats the old hardcoded .slice(0, 160) + "…" */}
            <span className="line-clamp-3 text-foreground text-sm leading-relaxed">
              {simulation.reasoning ??
                `${label} with score ${simulation.productScore ?? "?"}`}
            </span>
          </li>
        ))}
      </ol>
    ) : (
      <p className="text-foreground-dimmed text-sm italic">{emptyLabel}</p>
    )}
  </div>
);

const BattlecardTab = ({
  store,
  product,
  winRate,
  canPublish,
  competitors,
  simulations,
}: {
  /** The trimmed `product` shape carries no storeId, so it is passed alongside. */
  store: string;
  product: ProductDetailData["product"];
  winRate: number;
  canPublish: boolean;
  competitors: ProductDetailData["competitors"];
  simulations: ProductDetailData["simulations"];
}) => {
  const translate = useTranslations("dashboard.products.detail.battlecard");
  const shared = useTranslations("dashboard.shared");

  if (competitors.length === 0)
    return (
      <div className="flex flex-col items-center gap-3 border-accent-foreground border-t bg-background-rich p-8 text-center">
        <p className="font-light text-foreground-dimmed text-sm">
          {translate("empty")}
        </p>
        <FindOffers store={store} product={product.id} />
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
        <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div>
          <SectionKicker>{translate("kicker")}</SectionKicker>
          <p className="mt-2 font-semibold text-foreground-rich text-lg">
            {translate("headToHead")}
          </p>
        </div>
        <p className="text-foreground-dimmed text-sm">
          {shared("count.competitors", { count: competitors.length })}
        </p>
      </div>

      {/* Every competitor used to print all of its win/loss reasoning inline,
          so the tab scrolled for pages. Each one now collapses to a single
          summary row and the reasoning sits behind a disclosure. */}
      <Accordion className="text-foreground">
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
            <AccordionItem
              key={competitor.id}
              value={competitor.id}
              className="border-accent-foreground border-b bg-background-rich"
            >
              {/* The trigger is a <button>, so its contents must be phrasing
                  content — spans, not divs. */}
              <AccordionTrigger
                className="items-center px-5 py-4 hover:bg-background-dimmed/40"
                classList={{
                  trigger: {
                    icon: "size-4 shrink-0 text-foreground-dimmed group-data-panel-open:rotate-180",
                  },
                }}
              >
                <span className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-foreground">
                      {competitor.title}
                    </span>
                    <span className="mt-0.5 block truncate font-normal text-foreground-dimmed text-sm">
                      {translate("vsProduct", { title: product.title })}
                    </span>
                  </span>

                  <span className="hidden w-28 shrink-0 sm:block">
                    <span className="block h-1.5 overflow-hidden rounded-full bg-accent-foreground">
                      <span
                        className={cn(
                          "block h-full rounded-full",
                          barColor(competitor.rate),
                        )}
                        style={{ width: `${competitor.rate}%` }}
                      />
                    </span>
                  </span>

                  <span className="shrink-0 font-normal text-foreground-dimmed text-xs tabular-nums">
                    {wins.length}W · {losses.length}L
                  </span>

                  <span
                    className={cn(
                      "shrink-0 font-bold text-2xl tabular-nums leading-none tracking-[-0.02em]",
                      rateColor(competitor.rate),
                    )}
                  >
                    {competitor.rate}
                    <span className="ml-0.5 font-medium text-foreground-dimmed text-sm">
                      %
                    </span>
                  </span>
                </span>
              </AccordionTrigger>

              <AccordionPanel>
                <div className="grid grid-cols-1 divide-y divide-accent-foreground border-accent-foreground border-t sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  <Outcome
                    tone="success"
                    label={translate("won")}
                    simulations={wins}
                    emptyLabel={translate("noWins")}
                  />
                  <Outcome
                    tone="error"
                    label={translate("lost")}
                    simulations={losses}
                    emptyLabel={translate("noLosses")}
                  />
                </div>
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>
    </>
  );
};

// Collapses a listing field to a row carrying its status, so the tab shows
// what's wrong at a glance instead of three always-open content dumps.
const ListingField = ({
  label,
  status,
  tone,
  children,
}: {
  label: string;
  status: string;
  tone: "success" | "error" | "neutral";
  children: ReactNode;
}) => (
  <AccordionItem
    value={label}
    className="border-accent-foreground border-b bg-background-rich"
  >
    {/* The trigger is a <button>, so its contents must be phrasing content. */}
    <AccordionTrigger
      className="items-center px-5 py-4 hover:bg-background-dimmed/40"
      classList={{
        trigger: {
          icon: "size-4 shrink-0 text-foreground-dimmed group-data-panel-open:rotate-180",
        },
      }}
    >
      <span className="flex min-w-0 flex-1 items-center justify-between gap-4">
        <span className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
          {label}
        </span>
        <StatusPill tone={tone}>{status}</StatusPill>
      </span>
    </AccordionTrigger>
    <AccordionPanel>
      <div className="border-accent-foreground border-t p-5">{children}</div>
    </AccordionPanel>
  </AccordionItem>
);

const OptimizeTab = ({
  store,
  product,
  winRate,
  canPublish,
  themeEditorUrl,
}: {
  store: string;
  product: ProductDetailData["product"];
  winRate: number;
  canPublish: boolean;
  themeEditorUrl: string | null;
}) => {
  const translate = useTranslations("dashboard.products.detail.optimizeTab");
  const fields = useTranslations("dashboard.products.detail.fields");
  const applyOptimization = useTranslations(
    "dashboard.products.detail.applyOptimization",
  );
  const publish = useTranslations("dashboard.products.detail.publish");
  const shared = useTranslations("dashboard.shared");
  const toast = useToastManager();
  const [isPending, startTransition] = useTransition();
  const [liveStructuredData, setLiveStructuredData] = useState<string | null>(
    null,
  );

  const structuredData = liveStructuredData ?? product.structuredData;

  const status = product.structuredDataStatus;

  // One verdict for what AI agents read on the live page, worst to best:
  // missing / ecentic-optimized_embed-off → store-default → ecentic-standard
  // → ecentic-optimized.
  const liveStatus = {
    "ecentic-optimized": {
      tone: "success" as const,
      label: translate("status.optimizedByEcentic"),
    },
    "ecentic-standard": {
      tone: "success" as const,
      label: translate("status.ecenticStandard"),
    },
    "store-default": {
      tone: "neutral" as const,
      label: translate("status.storeDefault"),
    },
    "ecentic-optimized_embed-off": {
      tone: "error" as const,
      label: translate("status.optimizedEmbedOff"),
    },
    missing: {
      tone: "error" as const,
      label: translate("status.noStructuredData"),
    },
    unreachable: {
      tone: "neutral" as const,
      label: translate("status.pageUnreachable"),
    },
  }[status];

  // Guidance per status: no structured data → enable the embed (a one-time,
  // store-wide toggle); default markup (store's or ecentic's) → suggest the
  // optimized version. Only `ecentic-optimized` needs nothing.
  const embedNotice = (() => {
    switch (status) {
      case "ecentic-optimized_embed-off":
        return {
          intent: "problem" as const,
          title: translate("embedNotice.embedOffTitle"),
          text: translate("embedNotice.embedOffText"),
          showEnable: true,
        };
      case "missing":
        return {
          intent: "problem" as const,
          title: translate("embedNotice.missingTitle"),
          text: translate("embedNotice.missingText"),
          showEnable: true,
        };
      case "store-default":
        return {
          intent: "problem" as const,
          title: translate("embedNotice.storeDefaultTitle"),
          text: translate("embedNotice.storeDefaultText"),
          showEnable: true,
        };
      case "ecentic-standard":
        return {
          intent: "suggestion" as const,
          title: translate("embedNotice.standardTitle"),
          text: translate("embedNotice.standardText"),
          showEnable: false,
        };
      default:
        return null;
    }
  })();

  const handleGenerateJsonLd = () => {
    startTransition(async () => {
      const generation = await Optimization.generateStructuredData({
        product: product.id,
      });
      if (!generation.success) {
        toast.add({
          title: translate("generationFailed"),
          description: generation.error.message,
          type: "error",
        });
        return;
      }
      setLiveStructuredData(generation.data.structuredData);
    });
  };

  const [publishStructured, isPublishingStructured] = useAsyncAction(
    async () => {
      const result = await Optimization.publishProductStructuredData({
        product: product.id,
      });

      if (!result.success) {
        toast.add({
          title: publish("failed"),
          description: result.error.message,
          type: "error",
        });
        return;
      }
      setLiveStructuredData(result.data.structuredData);

      const { themeEditorUrl } = result.data;
      toast.add({
        title: translate("structuredDataPublished"),
        description: translate("structuredDataPublishedDescription"),
        type: "success",
        ...(themeEditorUrl && {
          actionLabel: translate("openThemeEditor"),
          onAction: () => window.open(themeEditorUrl, "_blank"),
        }),
      });
    },
  );

  return (
    <>
      {/* The primary action used to sit in the right half of a 2-col grid,
          beside a stray paragraph. It leads now. */}
      <ApplyOptimization
        product={product}
        winRate={winRate}
        canPublish={canPublish}
        publishLabel={applyOptimization("optimizePublish")}
        reviewQueueHref={`/dashboard/${store}/optimize`}
      />

      <div className="relative flex items-end justify-between gap-4 border-accent-foreground border-b p-4">
        <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div>
          <SectionKicker>{translate("listingAuditKicker")}</SectionKicker>
          <p className="mt-2 font-semibold text-foreground-rich text-lg">
            {translate("title")}
          </p>
          <p className="mt-1 max-w-prose text-foreground-dimmed text-sm">
            {translate("description")}
          </p>
        </div>
        <p className="shrink-0 text-foreground-dimmed text-sm">
          {translate("completeness")}{" "}
          <span className={cn("font-semibold", rateColor(product.quality))}>
            {product.quality}
            <span className="font-normal text-foreground-dimmed">/100</span>
          </span>
        </p>
      </div>

      <ListingAudit product={product} />

      <div className="relative border-accent-foreground border-y p-4">
        <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <SectionKicker>{translate("currentListing")}</SectionKicker>
      </div>

      {/* Same treatment as the battlecard. Each field collapses to a row with
          its status, and anything that needs attention starts expanded — so the
          fix is one click away without three content dumps (each with its own
          nested scrollbar) sitting open by default. */}
      <Accordion
        className="text-foreground"
        defaultValue={[
          ...(product.description ? [] : [fields("description")]),
          // The goal state needs no attention; every other status has a next
          // step waiting inside.
          ...(status === "ecentic-optimized" ? [] : [fields("structuredData")]),
        ]}
      >
        <ListingField
          label={fields("title")}
          tone="neutral"
          status={translate("characters", { count: product.title.length })}
        >
          <p className="text-foreground">{product.title}</p>
        </ListingField>

        <ListingField
          label={fields("description")}
          tone={product.description ? "success" : "error"}
          status={product.description ? shared("present") : shared("missing")}
        >
          {product.description ? (
            <div
              className="text-foreground text-sm leading-relaxed [&_ol]:mt-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_p+p]:mt-2 [&_ul]:mt-1 [&_ul]:list-disc [&_ul]:pl-4"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: product description is HTML sourced from the user's own store
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          ) : (
            <p className="text-error text-sm italic">
              {translate("noDescription")}
            </p>
          )}
        </ListingField>

        {/* The collapsed row reports the live page, not our database — a green
            "Generated" beside a page with no markup is exactly the lie that
            sent us looking here in the first place. */}
        <ListingField
          label={fields("structuredData")}
          tone={liveStatus.tone}
          status={liveStatus.label}
        >
          <div className="mb-3 flex items-center justify-between gap-3 border-accent-foreground border-b pb-3">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                {translate("liveOnStore")}
              </span>
              <StatusPill tone={liveStatus.tone}>{liveStatus.label}</StatusPill>
            </div>
            <span className="text-[10px] text-foreground-dimmed">
              {translate("whatAgentsRead")}
            </span>
          </div>

          {embedNotice && (
            <div
              className={cn(
                "mb-3 border p-3",
                embedNotice.intent === "problem"
                  ? "border-warning/30 bg-warning/5"
                  : "border-accent-foreground bg-background-dimmed",
              )}
            >
              <p
                className={cn(
                  "font-medium text-[10px] uppercase tracking-[0.08em]",
                  embedNotice.intent === "problem"
                    ? "text-warning"
                    : "text-foreground-dimmed",
                )}
              >
                {embedNotice.title}
              </p>
              <p className="mt-1 text-foreground text-sm">{embedNotice.text}</p>
              {embedNotice.showEnable && themeEditorUrl && (
                <Button
                  type="button"
                  color="accent"
                  className="mt-3"
                  onClick={() => window.open(themeEditorUrl, "_blank")}
                >
                  {translate("enableAppEmbed")}
                  <ArrowRightIcon className="size-4" />
                </Button>
              )}
            </div>
          )}

          {structuredData ? (
            <div className="space-y-3">
              <p className="text-foreground-dimmed text-sm">
                {translate("structuredDataHelp", {
                  metafield: "ecentic.structured_data",
                })}
              </p>
              {/* JSON-LD is genuinely unbounded, so this one keeps a cap. */}
              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap border border-accent-foreground bg-background-dimmed p-3 font-mono text-foreground-dimmed text-xs leading-relaxed">
                {structuredData}
              </pre>
              {canPublish && (
                <Button
                  type="button"
                  color="accent"
                  onClick={publishStructured}
                  disabled={isPublishingStructured}
                >
                  {isPublishingStructured
                    ? translate("publishing")
                    : translate("publishStructuredData")}
                  {!isPublishingStructured && (
                    <ArrowRightIcon className="size-4" />
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-foreground-dimmed text-sm">
                {translate("noStructuredDataYet")}
              </p>
              <Button
                type="button"
                color="accent"
                onClick={handleGenerateJsonLd}
                disabled={isPending}
              >
                {isPending
                  ? translate("generating")
                  : translate("generateJsonLd")}
                {!isPending && <ArrowRightIcon className="size-4" />}
              </Button>
            </div>
          )}
        </ListingField>
      </Accordion>
    </>
  );
};
