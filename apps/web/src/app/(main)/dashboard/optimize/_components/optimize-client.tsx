"use client";

import { CheckIcon, LoaderIcon, XIcon } from "@zenncore/icons";
import { useAsyncAction } from "@zenncore/utils/hooks";
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
import type { OptimizationDashboardData } from "@/server/app/optimization";
import * as Optimization from "@/server/app/optimization";

const typeLabel = (type: string) => {
  switch (type) {
    case "title":
      return "Title";
    case "description":
      return "Description";
    case "structured_data":
      return "Structured Data";
    case "all":
      return "Title + Description";
    default:
      return type;
  }
};

const formatPublished = (iso: string | null) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
};

const severityClass = (severity: "high" | "medium") => {
  switch (severity) {
    case "high":
      return "text-error";
    default:
      return "text-warning";
  }
};

const categoryLabel = (
  category: "seo" | "content" | "structured_data" | "platform",
) => {
  switch (category) {
    case "seo":
      return "SEO";
    case "content":
      return "Content";
    case "structured_data":
      return "Structured data";
    case "platform":
      return "Platform";
  }
};

export const OptimizeClient = ({
  data,
}: {
  data: OptimizationDashboardData;
}) => {
  const router = useRouter();
  const toast = useToastManager();
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [isApprovingAll, startApprovingAll] = useTransition();

  const refresh = () => {
    router.refresh();
  };

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
      refresh();
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
      refresh();
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
      refresh();
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
        refresh();
        return;
      }
      toast.add({
        title: "All pending listings updated",
        description: `${result.data.count} product(s) published to your store.`,
        type: "success",
      });
      refresh();
    });
  };

  const { pending, published, dismissed, diagnostics } = data;

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
          <button
            type="button"
            disabled={
              pending.length === 0 || isApprovingAll || busyProductId !== null
            }
            onClick={handleApproveAll}
            className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isApprovingAll ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <CheckIcon className="size-4" />
            )}
            Approve All ({pending.length})
          </button>
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 px-6 py-6">
          <div className="mb-4 grid grid-cols-1 gap-px border border-accent-foreground bg-accent-foreground sm:grid-cols-3">
            <div className="bg-background-dimmed p-3">
              <p className="font-light text-foreground-dimmed text-xs">
                Low win-rate products
              </p>
              <p className="text-2xl text-foreground tabular-nums">
                {diagnostics.lowWinRateProducts}
              </p>
            </div>
            <div className="bg-background-dimmed p-3">
              <p className="font-light text-foreground-dimmed text-xs">
                Auto-publish eligible
              </p>
              <p className="text-2xl text-foreground tabular-nums">
                {diagnostics.publishableLowWinRateProducts}
              </p>
            </div>
            <div className="bg-background-dimmed p-3">
              <p className="font-light text-foreground-dimmed text-xs">
                Manual-fix only
              </p>
              <p className="text-2xl text-foreground tabular-nums">
                {diagnostics.nonPublishableLowWinRateProducts}
              </p>
            </div>
          </div>

          {diagnostics.insights.length > 0 && (
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
                {diagnostics.insights.map((insight) => (
                  <div
                    key={`${insight.productId}-${insight.category}-${insight.message}`}
                    className="border border-accent-foreground bg-background-dimmed p-3"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground text-sm">
                        {insight.productTitle}
                      </p>
                      <span className="border border-accent-foreground px-1.5 py-0.5 text-xs text-foreground-dimmed">
                        {categoryLabel(insight.category)}
                      </span>
                      <span className={severityClass(insight.severity)}>
                        {insight.severity.toUpperCase()}
                      </span>
                      <span className="font-light text-foreground-dimmed text-xs">
                        Win rate {insight.winRate}%
                      </span>
                    </div>
                    <p className="font-light text-foreground-dimmed text-xs">
                      {insight.message}
                    </p>
                    <p className="mt-1 text-foreground text-xs">
                      {insight.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                <div className="py-12 text-center">
                  <p className="font-medium text-base text-foreground">
                    No pending optimizations
                  </p>
                  <p className="mt-1 font-light text-foreground-dimmed text-xs">
                    Products from Shopify or WooCommerce with simulation win
                    rate under 55% appear here. Run a scan, then approve to push
                    AI-improved titles and descriptions to your store.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {pending.map((optimization) => (
                    <div
                      key={optimization.productId}
                      className="border border-accent-foreground bg-background p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-base text-foreground">
                              {optimization.productTitle}
                            </p>
                            <span className="border border-accent-foreground px-1.5 py-0.5 text-foreground-dimmed text-xs">
                              {typeLabel(optimization.type)}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3">
                            <span className="bg-success/10 px-1.5 py-0.5 font-medium text-success text-xs">
                              +{optimization.estimatedLift}% est. lift
                            </span>
                            <span className="font-light text-foreground-dimmed text-xs">
                              Win rate: {optimization.winRateBefore}% · Models:{" "}
                              {optimization.modelsAffected.join(", ")}
                            </span>
                          </div>
                          <p className="mt-2 font-light text-foreground-dimmed text-xs">
                            Approve generates an improved listing with AI, then
                            publishes to your store (Shopify or WooCommerce).
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <Link
                            href={`/dashboard/products/${optimization.productId}`}
                            className="border border-accent-foreground px-2.5 py-1 text-foreground text-xs transition-colors hover:bg-background-dimmed"
                          >
                            Preview
                          </Link>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => approveOne(optimization.productId)}
                            className="flex items-center gap-1 bg-primary px-2.5 py-1 text-sm text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                          >
                            {busyProductId === optimization.productId ||
                            isApprovePending ? (
                              <LoaderIcon className="size-3 animate-spin" />
                            ) : (
                              <CheckIcon className="size-3" />
                            )}
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => dismissOne(optimization.productId)}
                            className="flex size-7 items-center justify-center border border-accent-foreground text-foreground-dimmed transition-colors hover:bg-background-dimmed disabled:opacity-50"
                            aria-label="Dismiss"
                          >
                            <XIcon className="size-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsPanel>

            <TabsPanel value="published">
              {published.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-medium text-base text-foreground">
                    No published optimizations yet
                  </p>
                  <p className="font-light text-foreground-dimmed text-xs">
                    Approved changes are recorded here with estimated win-rate
                    impact.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {published.map((optimization) => (
                    <div
                      key={optimization.recordId}
                      className="border border-accent-foreground bg-background p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-base text-foreground">
                            {optimization.productTitle}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-3">
                            <span className="border border-accent-foreground px-1.5 py-0.5 text-foreground-dimmed text-xs">
                              {typeLabel(optimization.type)}
                            </span>
                            <span className="font-light text-foreground-dimmed text-xs">
                              {formatPublished(optimization.publishedAt)}
                            </span>
                          </div>
                          {optimization.winRateBefore !== null &&
                            optimization.winRateAfter !== null && (
                              <p className="mt-1 font-light text-foreground-dimmed text-xs">
                                Est. win rate: {optimization.winRateBefore}% →{" "}
                                <span className="font-medium text-foreground">
                                  {optimization.winRateAfter}%
                                </span>
                              </p>
                            )}
                        </div>
                        <Link
                          href={`/dashboard/products/${optimization.productId}`}
                          className="border border-accent-foreground px-2.5 py-1 text-foreground-dimmed text-xs transition-colors hover:bg-background-dimmed"
                        >
                          View product
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsPanel>

            <TabsPanel value="dismissed">
              {dismissed.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-medium text-base text-foreground">
                    Nothing dismissed
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {dismissed.map((optimization) => (
                    <div
                      key={optimization.recordId}
                      className="border border-accent-foreground bg-background p-4 opacity-80"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-base text-foreground">
                            {optimization.productTitle}
                          </p>
                          <span className="border border-accent-foreground px-1.5 py-0.5 text-foreground-dimmed text-xs">
                            {typeLabel(optimization.type)}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => reconsiderOne(optimization.productId)}
                          className="border border-accent-foreground bg-background px-2.5 py-1 text-foreground text-xs transition-colors hover:bg-background-dimmed disabled:opacity-50"
                        >
                          {busyProductId === optimization.productId ? (
                            <LoaderIcon className="size-3 animate-spin" />
                          ) : (
                            "Reconsider"
                          )}
                        </button>
                      </div>
                    </div>
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
