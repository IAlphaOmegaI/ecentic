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
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
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
import { useRouter } from "next/navigation";
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
} from "../../_components/grid";

const CATEGORY_LABELS = {
  seo: "SEO",
  content: "Content",
  structured_data: "Structured data",
  platform: "Platform",
} as const;

const SEVERITY_CLASSES = {
  high: "font-medium text-error text-xs uppercase tracking-[0.2em]",
  medium: "font-medium text-warning text-xs uppercase tracking-[0.2em]",
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
    <p className="font-medium text-5xl text-foreground tabular-nums tracking-tight">
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
    <p className="font-medium text-base text-foreground">{title}</p>
    {description && (
      <p className="mt-1 font-light text-foreground-dimmed text-xs">
        {description}
      </p>
    )}
  </div>
);

const InsightCard = ({
  insight,
  productTitle,
}: {
  insight: DashboardData["diagnostics"]["insights"][number];
  productTitle: string;
}) => (
  <div className="bg-background-rich p-5 transition-colors hover:bg-background">
    <div className="mb-1 flex flex-wrap items-center gap-3">
      <p className="font-medium text-foreground">{productTitle}</p>
      <span className="text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
        {CATEGORY_LABELS[insight.category]}
      </span>
      <span className={SEVERITY_CLASSES[insight.severity]}>
        {insight.severity.toUpperCase()}
      </span>
      <span className="font-light text-foreground-dimmed text-xs">
        {insight.winRate}% win rate
      </span>
    </div>
    <p className="font-light text-foreground-dimmed">{insight.message}</p>
    <p className="mt-2 text-foreground">{insight.recommendation}</p>
  </div>
);

const PendingCard = ({
  item,
  busy,
  selected,
  isApprovePending,
  onApprove,
  onDismiss,
}: {
  item: DashboardData["pending"][number];
  busy: boolean;
  selected: string | null;
  isApprovePending: boolean;
  onApprove: (productId: string) => void;
  onDismiss: (productId: string) => void;
}) => (
  <div className="bg-background-rich p-5 transition-colors hover:bg-background">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-medium text-base text-foreground">
            {item.product.title}
          </p>
          <span className="text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
            Title + Description
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-success">
            <TrendUpIcon className="size-6" />+{item.estimatedLift}% est. lift
          </span>
          <span className="font-light text-foreground-dimmed text-xs">
            Win rate: {item.winRate}% · Models: {item.models.join(", ")}
          </span>
        </div>
        <p className="mt-2 font-light text-foreground-dimmed text-xs">
          Approve generates an improved listing with AI, then publishes to your
          store (Shopify or WooCommerce).
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          variant="outline"
          color="accent"
          render={<Link href={`/dashboard/products/${item.product.id}`} />}
        >
          Preview
        </Button>
        <Button
          variant="flat"
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
          variant="outline"
          color="accent"
          size="icon"
          disabled={busy}
          onClick={() => onDismiss(item.product.id)}
          aria-label="Dismiss"
        >
          <XIcon className="size-6" />
        </Button>
      </div>
    </div>
  </div>
);

const PublishedCard = ({
  record,
  productTitle,
}: {
  record: Type;
  productTitle: string;
}) => (
  <div className="bg-background-rich p-5 transition-colors hover:bg-background">
    <div className="flex items-start justify-between">
      <div>
        <p className="font-medium text-base text-foreground">{productTitle}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span className="font-light text-foreground-dimmed text-xs">
            {formatPublished(record.publishedAt)}
          </span>
        </div>
        {record.winRateBefore !== null && record.winRateAfter !== null && (
          <p className="mt-1 font-light text-foreground-dimmed text-xs">
            Est. win rate: {record.winRateBefore}% →{" "}
            <span className="font-medium text-foreground">
              {record.winRateAfter}%
            </span>
          </p>
        )}
      </div>
      <Button
        variant="outline"
        color="accent"
        className="px-2.5 py-1 text-xs"
        render={<Link href={`/dashboard/products/${record.productId}`} />}
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
  <div className="bg-background-rich p-5 opacity-80 transition-colors hover:bg-background">
    <div className="flex items-center justify-between gap-4">
      <p className="font-medium text-base text-foreground">{productTitle}</p>
      <Button
        variant="outline"
        color="accent"
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
      <p className="mt-2 font-medium text-2xl text-foreground">
        Diagnostics for low win rate
      </p>
      <p className="mt-1 font-light text-foreground-dimmed text-lg">
        These recommendations cover SEO/data-quality/platform issues in addition
        to listing text optimizations.
      </p>
    </div>
    <div className="max-h-64 overflow-y-auto">
      <div className="space-y-px bg-accent-foreground">
        {insights.map((insight) => (
          <InsightCard
            key={`${insight.productId}-${insight.category}-${insight.message}`}
            insight={insight}
            productTitle={
              products[insight.productId]?.title ?? "Unknown product"
            }
          />
        ))}
      </div>
    </div>
  </div>
);

export const OptimizeClient = ({ data }: { data: DashboardData }) => {
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

  const primaryShopifyStore = data.shopifyStores[0] ?? null;

  const [handleOptimizeStore, isOptimizingStore] = useAsyncAction(async () => {
    if (!primaryShopifyStore) return;
    const result = await Optimization.optimizeStoreForAgents({
      store: primaryShopifyStore.id,
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
      description: `${profileWritten} UCP metafields, ${productsPushed}/${productsTotal} products, ${listingsRewritten} listings rewritten.`,
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
        <div className="mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5 text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
              <span
                className={cn(
                  "size-2",
                  pending.length > 0 ? "bg-success" : "bg-accent-rich",
                )}
              />
              {pending.length} pending suggestion
              {pending.length === 1 ? "" : "s"}
            </div>
            <h1 className="mt-3 font-medium text-4xl text-foreground">
              Optimization Center
            </h1>
            <p className="mt-1 font-light text-foreground-dimmed text-lg">
              Approve AI-improved listings and push them straight to your store.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {primaryShopifyStore && (
              <Button
                variant="flat"
                color="primary"
                disabled={isOptimizingStore || busy}
                onClick={handleOptimizeStore}
              >
                {isOptimizingStore ? (
                  <LoaderIcon className="size-4 animate-spin" />
                ) : (
                  <CheckIcon className="size-4" />
                )}
                Optimize {primaryShopifyStore.name} for Agents
              </Button>
            )}
            <Button
              variant="outline"
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
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-3">
            <StatCard
              label="Low win-rate products"
              value={diagnostics.lowWinRateCount}
              icon={<TrendDownIcon className="size-8 shrink-0 text-error" />}
            />
            <StatCard
              label="Auto-publish eligible"
              value={diagnostics.publishableCount}
              icon={<CircleBoltIcon className="size-8 shrink-0 text-success" />}
            />
            <StatCard
              label="Manual-fix only"
              value={diagnostics.nonPublishableCount}
              icon={<HammerIcon className="size-8 shrink-0 text-warning" />}
            />
          </div>
        </div>
      </div>

      <SectionGutter />

      {hasDiagnostics && (
        <>
          <div className="-mx-8 border-accent-foreground border-t border-b">
            <div className="mx-8 bg-background-rich">
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
        <div className="mx-8 bg-background-rich">
          <div className="border-accent-foreground border-b p-4">
            <SectionKicker>{queueKicker} — Optimization Queue</SectionKicker>
            <p className="mt-2 font-medium text-2xl text-foreground">
              Listing Suggestions
            </p>
          </div>

          <Tabs defaultValue="pending">
            <TabsList className="w-full border-0">
              <TabsIndicator className="h-full" />
              <Tab value="pending" className="flex-1">
                Pending{" "}
                <span className="ml-1 text-xs tabular-nums">
                  {pending.length}
                </span>
              </Tab>
              <Tab value="published" className="flex-1">
                Published
              </Tab>
              <Tab value="dismissed" className="flex-1">
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
