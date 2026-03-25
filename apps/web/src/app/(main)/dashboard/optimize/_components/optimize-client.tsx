"use client";

import { CheckIcon, LoaderIcon, XIcon } from "@zenncore/icons";
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
import { useState, useTransition } from "react";
import type { DashboardData, Type } from "@/server/app/optimization";
import * as Optimization from "@/server/app/optimization";
import type * as Product from "@/server/app/product";

const CATEGORY_LABELS = {
  seo: "SEO",
  content: "Content",
  structured_data: "Structured data",
  platform: "Platform",
} as const;

const SEVERITY_CLASSES = {
  high: "text-error",
  medium: "text-warning",
} as const;

const formatPublished = (date: string | Date | null) => {
  if (!date) return "";
  return new Date(date).toLocaleString();
};

// --- Sub-components ---

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="bg-background-dimmed p-3">
    <p className="font-light text-foreground-dimmed text-xs">{label}</p>
    <p className="text-2xl text-foreground tabular-nums">{value}</p>
  </div>
);

const EmptyState = ({
  title,
  description,
}: {
  title: string;
  description?: string;
}) => (
  <div className="py-12 text-center">
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
  <div className="border border-accent-foreground bg-background-dimmed p-3">
    <div className="mb-1 flex flex-wrap items-center gap-2">
      <p className="font-medium text-foreground text-sm">{productTitle}</p>
      <span className="border border-accent-foreground px-1.5 py-0.5 text-foreground-dimmed text-xs">
        {CATEGORY_LABELS[insight.category]}
      </span>
      <span className={SEVERITY_CLASSES[insight.severity]}>
        {insight.severity.toUpperCase()}
      </span>
      <span className="font-light text-foreground-dimmed text-xs">
        Win rate {insight.winRate}%
      </span>
    </div>
    <p className="font-light text-foreground-dimmed text-xs">
      {insight.message}
    </p>
    <p className="mt-1 text-foreground text-xs">{insight.recommendation}</p>
  </div>
);

const PendingCard = ({
  item,
  busy,
  busyProductId,
  isApprovePending,
  onApprove,
  onDismiss,
}: {
  item: DashboardData["pending"][number];
  busy: boolean;
  busyProductId: string | null;
  isApprovePending: boolean;
  onApprove: (productId: string) => void;
  onDismiss: (productId: string) => void;
}) => (
  <div className="border border-accent-foreground bg-background p-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-base text-foreground">
            {item.product.title}
          </p>
          <span className="border border-accent-foreground px-1.5 py-0.5 text-foreground-dimmed text-xs">
            Title + Description
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span className="bg-success/10 px-1.5 py-0.5 font-medium text-success text-xs">
            +{item.estimatedLift}% est. lift
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
          className="px-2.5 py-1 text-xs"
          render={<Link href={`/dashboard/products/${item.product.id}`} />}
        >
          Preview
        </Button>
        <Button
          variant="flat"
          color="primary"
          className="px-2.5 py-1 text-sm"
          disabled={busy}
          onClick={() => onApprove(item.product.id)}
        >
          {busyProductId === item.product.id || isApprovePending ? (
            <LoaderIcon className="size-3 animate-spin" />
          ) : (
            <CheckIcon className="size-3" />
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
          <XIcon className="size-3" />
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
  <div className="border border-accent-foreground bg-background p-4">
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
  <div className="border border-accent-foreground bg-background p-4 opacity-80">
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
          <LoaderIcon className="size-3 animate-spin" />
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
}) => {
  if (insights.length === 0) return null;

  return (
    <div className="mb-4 border border-accent-foreground bg-background">
      <div className="border-accent-foreground border-b px-4 py-2">
        <p className="font-medium text-foreground text-sm">
          Diagnostics for low win rate
        </p>
        <p className="font-light text-foreground-dimmed text-xs">
          These recommendations cover SEO/data-quality/platform issues in
          addition to listing text optimizations.
        </p>
      </div>
      <div className="max-h-64 space-y-2 overflow-y-auto p-3">
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
  );
};

// --- Main component ---

export const OptimizeClient = ({ data }: { data: DashboardData }) => {
  const router = useRouter();
  const toast = useToastManager();

  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [isApprovingAll, startApprovingAll] = useTransition();

  const [approveOne, isApprovePending] = useAsyncAction(
    async (productId: string) => {
      setBusyProductId(productId);
      const result = await Optimization.approveProductListing({ productId });
      setBusyProductId(null);
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
      setBusyProductId(productId);
      const result = await Optimization.dismissSuggestion({ productId });
      setBusyProductId(null);
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
      setBusyProductId(productId);
      const result = await Optimization.reconsiderSuggestion({ productId });
      setBusyProductId(null);
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

  const busy =
    busyProductId !== null ||
    isApprovingAll ||
    isApprovePending ||
    isDismissPending ||
    isReconsiderPending;

  const handleApproveAll = () => {
    startApprovingAll(async () => {
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
  };

  const { pending, published, dismissed, products, diagnostics } = data;

  return (
    <div className="flex flex-col">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 flex items-center justify-between px-6 py-8">
          <div>
            <h1 className="font-medium text-3xl text-foreground">
              Optimization Center
            </h1>
            <p className="font-light text-foreground-dimmed text-sm">
              {pending.length} pending suggestion
              {pending.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button
            variant="flat"
            color="primary"
            className="px-3 py-1.5 text-sm"
            disabled={
              pending.length === 0 || isApprovingAll || busyProductId !== null
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

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 px-6 py-6">
          <div className="mb-4 grid grid-cols-1 gap-px border border-accent-foreground bg-accent-foreground sm:grid-cols-3">
            <StatCard
              label="Low win-rate products"
              value={diagnostics.lowWinRateCount}
            />
            <StatCard
              label="Auto-publish eligible"
              value={diagnostics.publishableCount}
            />
            <StatCard
              label="Manual-fix only"
              value={diagnostics.nonPublishableCount}
            />
          </div>

          <DiagnosticsPanel
            insights={diagnostics.insights}
            products={products}
          />

          <Tabs defaultValue="pending">
            <TabsList className="mb-4 h-auto border border-accent-foreground bg-transparent px-0">
              <TabsIndicator className="top-0 h-full translate-y-0 rounded-none" />
              <Tab value="pending">
                Pending{" "}
                <span className="ml-1 bg-white/20 px-1 text-xs">
                  {pending.length}
                </span>
              </Tab>
              <Tab value="published">Published</Tab>
              <Tab value="dismissed">Dismissed</Tab>
            </TabsList>

            <TabsPanel value="pending">
              {pending.length === 0 ? (
                <EmptyState
                  title="No pending optimizations"
                  description="Products from Shopify or WooCommerce with simulation win rate under 55% appear here. Run a scan, then approve to push AI-improved titles and descriptions to your store."
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {pending.map((item) => (
                    <PendingCard
                      key={item.product.id}
                      item={item}
                      busy={busy}
                      busyProductId={busyProductId}
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
                <div className="flex flex-col gap-3">
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
                <div className="flex flex-col gap-3">
                  {dismissed.map((record) => (
                    <DismissedCard
                      key={record.id}
                      record={record}
                      productTitle={
                        products[record.productId]?.title ?? "Unknown product"
                      }
                      busy={busy}
                      busyProductId={busyProductId}
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
