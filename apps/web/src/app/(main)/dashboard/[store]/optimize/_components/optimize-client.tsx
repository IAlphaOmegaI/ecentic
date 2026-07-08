"use client";

import {
  CheckIcon,
  CircleBoltIcon,
  HammerIcon,
  LoaderIcon,
  TrendDownIcon,
  TrendUpIcon,
  XIcon,
} from "@zenncore/icons";
import { useAsyncAction } from "@zenncore/utils/hooks";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import { useToastManager } from "@zenncore/web/components/toast";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import type { DashboardData, Type } from "@/server/app/optimization";
import * as Optimization from "@/server/app/optimization";
import type * as Product from "@/server/app/product";
import {
  Crosshair,
  SectionGutter,
  SectionKicker,
  StatLabel,
  StatusPill,
  WinRateBadge,
} from "../../../_components/grid";

const CATEGORY_LABELS = {
  seo: "SEO",
  content: "Content",
  structured_data: "Structured data",
  platform: "Platform",
} as const;

const TYPE_TAG_CLASSES =
  "rounded bg-background-dimmed px-1.5 py-0.5 font-semibold text-[10px] text-foreground-dimmed uppercase tracking-[0.06em]";

const SUGGESTION_CARD_CLASSES =
  "bg-background-rich p-5 transition-colors hover:bg-background";

const SEVERITY_CLASSES = {
  high: "rounded bg-error/10 px-1.5 py-0.5 font-semibold text-[10px] text-error uppercase tracking-[0.06em]",
  medium:
    "rounded bg-warning/10 px-1.5 py-0.5 font-semibold text-[10px] text-warning uppercase tracking-[0.06em]",
  low: "rounded bg-success/10 px-1.5 py-0.5 font-semibold text-[10px] text-success uppercase tracking-[0.06em]",
} as const;

const formatPublished = (date: string | Date | null) => {
  if (!date) return "";
  return new Date(date).toLocaleString();
};

const StatCard = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) => (
  <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
    <StatLabel label={label} icon={icon} />
    <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
      {value}
    </p>
  </div>
);

const EmptyState = ({
  title,
  description,
}: {
  title: string;
  description?: string;
}) => (
  <div className="bg-background-rich py-12 text-center">
    <p className="font-medium text-base text-foreground-rich">{title}</p>
    {description && (
      <p className="mx-auto mt-1 max-w-xl text-foreground-dimmed text-xs">
        {description}
      </p>
    )}
  </div>
);

// Collapses each diagnostic to one row: product + signal chips, with the
// message/recommendation behind a disclosure. A low-win-rate product can
// produce many insights, and printing all of them expanded was the swamp.
const InsightCard = ({
  value,
  insight,
  productTitle,
}: {
  value: string;
  insight: DashboardData["diagnostics"]["insights"][number];
  productTitle: string;
}) => (
  <AccordionItem
    value={value}
    className="border-accent-foreground border-b bg-background-rich"
  >
    {/* The trigger is a <button>, so contents must be phrasing content. */}
    <AccordionTrigger
      className="items-center px-5 py-3.5 hover:bg-background-dimmed/40"
      classList={{
        trigger: {
          icon: "size-4 shrink-0 text-foreground-dimmed group-data-panel-open:rotate-180",
        },
      }}
    >
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <span className="truncate font-medium text-foreground-rich">
          {productTitle}
        </span>
        <span className={SEVERITY_CLASSES[insight.severity]}>
          {insight.severity.toUpperCase()}
        </span>
        <span className={TYPE_TAG_CLASSES}>
          {CATEGORY_LABELS[insight.category]}
        </span>
        <WinRateBadge rate={insight.winRate} />
      </span>
    </AccordionTrigger>
    <AccordionPanel>
      <div className="space-y-2 border-accent-foreground border-t px-5 py-4">
        <p className="text-foreground-dimmed text-sm">{insight.message}</p>
        <p className="text-foreground text-sm">{insight.recommendation}</p>
      </div>
    </AccordionPanel>
  </AccordionItem>
);

const PendingCard = ({
  store,
  item,
  busy,
  selected,
  isApprovePending,
  onApprove,
  onDismiss,
}: {
  store: string;
  item: DashboardData["pending"][number];
  busy: boolean;
  selected: string | null;
  isApprovePending: boolean;
  onApprove: (productId: string) => void;
  onDismiss: (productId: string) => void;
}) => (
  // One compact row: title + signal chips on the left, actions on the right.
  // The old per-card explainer paragraph and "Models:" line were identical on
  // every card — that boilerplate is what made the queue a wall of text.
  <div className={SUGGESTION_CARD_CLASSES}>
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="truncate font-medium text-base text-foreground-rich">
          {item.product.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 font-semibold text-[11px] text-success">
            <TrendUpIcon className="size-3.5" />+{item.estimatedLift}%
          </span>
          <WinRateBadge rate={item.winRate} />
          <span className={TYPE_TAG_CLASSES} title={item.models.join(", ")}>
            Title + Description
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          color="accent"
          render={
            <Link href={`/dashboard/${store}/products/${item.product.id}`} />
          }
        >
          Preview
        </Button>
        <Button
          color="primary"
          disabled={busy}
          onClick={() => onApprove(item.product.id)}
        >
          {selected === item.product.id || isApprovePending ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <CheckIcon className="size-4" />
          )}
          Approve
        </Button>
        <Button
          color="neutral"
          size="icon"
          className="text-foreground-dimmed hover:text-error"
          disabled={busy}
          onClick={() => onDismiss(item.product.id)}
          aria-label="Dismiss"
        >
          <XIcon className="size-4" />
        </Button>
      </div>
    </div>
  </div>
);

const PublishedCard = ({
  store,
  record,
  productTitle,
}: {
  store: string;
  record: Type;
  productTitle: string;
}) => (
  <div className={SUGGESTION_CARD_CLASSES}>
    <div className="flex items-start justify-between">
      <div>
        <p className="font-medium text-base text-foreground-rich">
          {productTitle}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span className="text-foreground-dimmed text-xs">
            {formatPublished(record.publishedAt)}
          </span>
        </div>
        {record.winRateBefore !== null && record.winRateAfter !== null && (
          <p className="mt-1 text-foreground-dimmed text-xs">
            Est. win rate: {record.winRateBefore}% →{" "}
            <span className="font-medium text-foreground">
              {record.winRateAfter}%
            </span>
          </p>
        )}
      </div>
      <Button
        color="primary"
        className="px-2.5 py-1 text-xs"
        render={
          <Link href={`/dashboard/${store}/products/${record.productId}`} />
        }
      >
        View product
      </Button>
    </div>
  </div>
);

const DismissedCard = ({
  record,
  productTitle,
  busy,
  busyProductId,
  onReconsider,
}: {
  record: Type;
  productTitle: string;
  busy: boolean;
  busyProductId: string | null;
  onReconsider: (productId: string) => void;
}) => (
  <div className={`${SUGGESTION_CARD_CLASSES} opacity-80`}>
    <div className="flex items-center justify-between gap-4">
      <p className="font-medium text-base text-foreground-rich">
        {productTitle}
      </p>
      <Button
        color="primary"
        className="px-2.5 py-1 text-xs"
        disabled={busy}
        onClick={() => onReconsider(record.productId)}
      >
        {busyProductId === record.productId ? (
          <LoaderIcon className="size-4 animate-spin" />
        ) : (
          "Reconsider"
        )}
      </Button>
    </div>
  </div>
);

const DiagnosticsPanel = ({
  insights,
  products,
}: {
  insights: DashboardData["diagnostics"]["insights"];
  products: Record<string, Product.Type>;
}) => (
  <div>
    <div className="border-accent-foreground border-b p-4">
      <SectionKicker>01 — Diagnostics</SectionKicker>
      <p className="mt-2 font-semibold text-foreground-rich text-lg">
        Diagnostics for low win rate
      </p>
      <p className="mt-1 text-foreground-dimmed text-sm">
        These recommendations cover SEO/data-quality/platform issues in addition
        to listing text optimizations.
      </p>
    </div>
    <Accordion
      className="text-foreground"
      // Auto-expand only the FIRST FEW high-severity insights — a bad store can
      // have dozens, and opening them all just rebuilds the wall. Everything
      // else stays a one-line row the user opens on demand.
      defaultValue={insights
        .filter((insight) => insight.severity === "high")
        .slice(0, 2)
        .map(
          (insight) =>
            `${insight.productId}-${insight.category}-${insight.message}`,
        )}
    >
      {insights.map((insight) => {
        const value = `${insight.productId}-${insight.category}-${insight.message}`;
        return (
          <InsightCard
            key={value}
            value={value}
            insight={insight}
            productTitle={
              products[insight.productId]?.title ?? "Unknown product"
            }
          />
        );
      })}
    </Accordion>
  </div>
);

export const OptimizeClient = ({ data }: { data: DashboardData }) => {
  const { store } = useParams<{ store: string }>();
  const router = useRouter();
  const toast = useToastManager();

  const [selected, setSelected] = useState<string | null>(null);

  const [approveOne, isApprovePending] = useAsyncAction(
    async (productId: string) => {
      setSelected(productId);
      const result = await Optimization.approveProductListing({
        product: productId,
      });
      setSelected(null);

      if (!result.success) {
        toast.add({
          title: "Publish failed",
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({
        title: "Listing updated",
        description: "Changes were pushed to your connected store.",
        type: "success",
      });
      router.refresh();
    },
  );

  const [dismissOne, isDismissPending] = useAsyncAction(
    async (productId: string) => {
      setSelected(productId);
      const result = await Optimization.dismissSuggestion({
        product: productId,
      });
      setSelected(null);
      if (!result.success) {
        toast.add({
          title: "Dismiss failed",
          description: result.error.message,
          type: "error",
        });
        return;
      }
      router.refresh();
    },
  );

  const [reconsiderOne, isReconsiderPending] = useAsyncAction(
    async (productId: string) => {
      setSelected(productId);
      const result = await Optimization.reconsiderSuggestion({
        product: productId,
      });
      setSelected(null);
      if (!result.success) {
        toast.add({
          title: "Could not restore",
          description: result.error.message,
          type: "error",
        });
        return;
      }
      router.refresh();
    },
  );

  const [handleApproveAll, isApprovingAll] = useAsyncAction(async () => {
    const result = await Optimization.approveAllPending();
    if (!result.success) {
      toast.add({
        title: "Some updates failed",
        description: result.error.message,
        type: "error",
      });
      router.refresh();
      return;
    }
    toast.add({
      title: "All pending listings updated",
      description: `${result.data.count} product(s) published to your store.`,
      type: "success",
    });
    router.refresh();
  });

  const optimizableStore =
    data.currentStore &&
    ["shopify", "shopify-public", "woocommerce"].includes(
      data.currentStore.platform,
    )
      ? data.currentStore
      : null;

  const [handleOptimizeStore, isOptimizingStore] = useAsyncAction(async () => {
    if (!optimizableStore) return;
    const result = await Optimization.optimizeStoreForAgents({
      store: optimizableStore.id,
    });
    if (!result.success) {
      toast.add({
        title: "Optimization failed",
        description: result.error.message,
        type: "error",
      });
      router.refresh();
      return;
    }
    const { profileWritten, productsPushed, productsTotal, listingsRewritten } =
      result.data;
    toast.add({
      title: "Store optimized for AI agents",
      description: `${productsPushed}/${productsTotal} products published, ${listingsRewritten} listings rewritten${
        profileWritten > 0 ? `, ${profileWritten} UCP metafields` : ""
      }.`,
      type: result.data.errors.length > 0 ? "warning" : "success",
    });
    router.refresh();
  });

  const busy =
    selected !== null ||
    isApprovingAll ||
    isApprovePending ||
    isDismissPending ||
    isReconsiderPending;

  const { pending, published, dismissed, products, diagnostics } = data;

  const hasDiagnostics = diagnostics.insights.length > 0;
  const queueKicker = hasDiagnostics ? "02" : "01";

  return (
    <div className="flex flex-col">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div>
            <StatusPill tone={pending.length > 0 ? "success" : "neutral"}>
              {pending.length} pending suggestion
              {pending.length === 1 ? "" : "s"}
            </StatusPill>
            <h1 className="mt-3 font-bold text-3xl text-foreground-rich tracking-[-0.02em]">
              Optimization Center
            </h1>
            <p className="mt-1 text-foreground-dimmed text-sm">
              Approve AI-improved listings and push them straight to your store.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {optimizableStore && (
              <Button
                color="primary"
                disabled={isOptimizingStore || busy}
                onClick={handleOptimizeStore}
              >
                {isOptimizingStore ? (
                  <LoaderIcon className="size-4 animate-spin" />
                ) : (
                  <CheckIcon className="size-4" />
                )}
                Optimize {optimizableStore.name} for Agents
              </Button>
            )}
            <Button
              color="primary"
              disabled={
                pending.length === 0 || isApprovingAll || selected !== null
              }
              onClick={handleApproveAll}
            >
              {isApprovingAll ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                <CheckIcon className="size-4" />
              )}
              Approve All ({pending.length})
            </Button>
          </div>
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-3">
            <StatCard
              label="Low win-rate products"
              value={diagnostics.lowWinRateCount}
              icon={<TrendDownIcon className="size-7.5 text-error" />}
            />
            <StatCard
              label="Auto-publish eligible"
              value={diagnostics.publishableCount}
              icon={<CircleBoltIcon className="size-7.5 text-success" />}
            />
            <StatCard
              label="Manual-fix only"
              value={diagnostics.nonPublishableCount}
              icon={<HammerIcon className="size-7.5 text-warning" />}
            />
          </div>
        </div>
      </div>

      <SectionGutter />

      {hasDiagnostics && (
        <>
          <div className="-mx-8 border-accent-foreground border-t border-b">
            <div className="relative mx-8 bg-background-rich">
              <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
              <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
              <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
              <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
              <DiagnosticsPanel
                insights={diagnostics.insights}
                products={products}
              />
            </div>
          </div>

          <SectionGutter />
        </>
      )}

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div className="border-accent-foreground border-b p-4">
            <SectionKicker>{queueKicker} — Optimization Queue</SectionKicker>
            <p className="mt-2 font-semibold text-foreground-rich text-lg">
              Listing Suggestions
            </p>
            {/* The per-card explainer lived here as boilerplate; it belongs once,
                in the header. */}
            <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
              Approve generates an AI-improved listing and publishes it to your
              store (Shopify or WooCommerce).
            </p>
          </div>

          <Tabs defaultValue="pending">
            {/* Tabs are h-8 to fit the list's 32px content box; the base h-9 was
                clipping and sitting off-centre from the indicator. */}
            <TabsList className="h-10 w-full rounded-md border-0 bg-background-dimmed p-1">
              <TabsIndicator className="rounded" />
              <Tab value="pending" className="h-8 flex-1 border-r-0">
                Pending{" "}
                <span className="ml-1.5 rounded-full bg-current/15 px-1.5 py-0.5 font-semibold text-[11px] tabular-nums">
                  {pending.length}
                </span>
              </Tab>
              <Tab value="published" className="h-8 flex-1 border-r-0">
                Published
              </Tab>
              <Tab value="dismissed" className="h-8 flex-1 border-r-0">
                Dismissed
              </Tab>
            </TabsList>

            <TabsPanel value="pending">
              {pending.length === 0 ? (
                <EmptyState
                  title="No pending optimizations"
                  description="Products from Shopify or WooCommerce with simulation win rate under 55% appear here. Run a scan, then approve to push AI-improved titles and descriptions to your store."
                />
              ) : (
                <div className="space-y-px border-accent-foreground border-t bg-accent-foreground">
                  {pending.map((item) => (
                    <PendingCard
                      key={item.product.id}
                      store={store}
                      item={item}
                      busy={busy}
                      selected={selected}
                      isApprovePending={isApprovePending}
                      onApprove={approveOne}
                      onDismiss={dismissOne}
                    />
                  ))}
                </div>
              )}
            </TabsPanel>

            <TabsPanel value="published">
              {published.length === 0 ? (
                <EmptyState
                  title="No published optimizations yet"
                  description="Approved changes are recorded here with estimated win-rate impact."
                />
              ) : (
                <div className="space-y-px border-accent-foreground border-t bg-accent-foreground">
                  {published.map((record) => (
                    <PublishedCard
                      key={record.id}
                      store={store}
                      record={record}
                      productTitle={
                        products[record.productId]?.title ?? "Unknown product"
                      }
                    />
                  ))}
                </div>
              )}
            </TabsPanel>

            <TabsPanel value="dismissed">
              {dismissed.length === 0 ? (
                <EmptyState title="Nothing dismissed" />
              ) : (
                <div className="space-y-px border-accent-foreground border-t bg-accent-foreground">
                  {dismissed.map((record) => (
                    <DismissedCard
                      key={record.id}
                      record={record}
                      productTitle={
                        products[record.productId]?.title ?? "Unknown product"
                      }
                      busy={busy}
                      busyProductId={selected}
                      onReconsider={reconsiderOne}
                    />
                  ))}
                </div>
              )}
            </TabsPanel>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
