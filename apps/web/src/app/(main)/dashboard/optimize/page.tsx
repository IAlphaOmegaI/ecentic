"use client";

import { CheckIcon, XIcon } from "@zenncore/icons";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import Link from "next/link";
import { optimizations } from "@/lib/mock-data";

const typeLabel = (type: string) => {
  switch (type) {
    case "title":
      return "Title";
    case "description":
      return "Description";
    case "structured_data":
      return "Structured Data";
    case "all":
      return "Title + Description + Data";
    default:
      return type;
  }
};

const pendingOptimizations = optimizations.filter(
  (o) => o.status === "pending",
);
const inProgressOptimizations = optimizations.filter(
  (o) => o.status === "in_progress",
);
const publishedOptimizations = optimizations.filter(
  (o) => o.status === "published",
);
const dismissedOptimizations = optimizations.filter(
  (o) => o.status === "dismissed",
);

const OptimizationCard = ({
  optimization,
  showActions = true,
}: {
  optimization: (typeof optimizations)[number];
  showActions?: boolean;
}) => (
  <div className="border border-accent-foreground bg-background p-4">
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-base text-foreground">
            {optimization.productTitle}
          </p>
          <span className="border border-accent-foreground px-1.5 py-0.5 text-foreground-dimmed text-xs">
            {typeLabel(optimization.type)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <span className="bg-success/10 px-1.5 py-0.5 font-medium text-success text-xs">
            +{optimization.estimatedLift}% est. lift
          </span>
          <span className="font-light text-foreground-dimmed text-xs">
            Affects: {optimization.modelsAffected.join(", ")}
          </span>
        </div>
        {"winRateBefore" in optimization && optimization.winRateBefore && (
          <p className="mt-1 font-light text-foreground-dimmed text-xs">
            Before: {optimization.winRateBefore}% → After:{" "}
            {optimization.winRateAfter}%{" "}
            <span className="font-medium text-success">
              (+{(optimization.winRateAfter ?? 0) - optimization.winRateBefore}
              %)
            </span>
          </p>
        )}
        {"publishedAt" in optimization && optimization.publishedAt && (
          <p className="mt-1 font-light text-foreground-dimmed text-xs">
            Published: {optimization.publishedAt}
          </p>
        )}
      </div>
      {showActions && (
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/products/${optimization.productId}`}
            className="border border-accent-foreground px-2.5 py-1 text-foreground text-xs transition-colors hover:bg-background-dimmed"
          >
            Preview
          </Link>
          <button
            type="button"
            className="flex items-center gap-1 bg-primary px-2.5 py-1 text-sm text-white transition-colors hover:bg-primary/90"
          >
            <CheckIcon className="size-3" />
            Approve
          </button>
          <button
            type="button"
            className="flex size-7 items-center justify-center border border-accent-foreground text-foreground-dimmed transition-colors hover:bg-background-dimmed"
            aria-label="Dismiss"
          >
            <XIcon className="size-3" />
          </button>
        </div>
      )}
    </div>
  </div>
);

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      {/* Title */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 flex items-center justify-between px-6 py-8">
          <div>
            <h1 className="font-medium text-3xl text-foreground">
              Optimization Center
            </h1>
            <p className="font-light text-foreground-dimmed text-sm">
              {pendingOptimizations.length} pending ·{" "}
              {inProgressOptimizations.length} in progress
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="border border-accent-foreground bg-background px-3 py-1.5 text-foreground text-sm transition-colors hover:bg-background-dimmed"
            >
              Auto-Optimization Settings
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary/90"
            >
              <CheckIcon className="size-4" />
              Approve All ({pendingOptimizations.length})
            </button>
          </div>
        </div>
      </div>

      {/* Tabs + content */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 px-6 py-6">
          <Tabs defaultValue="pending">
            <TabsList className="mb-4 h-auto border border-accent-foreground bg-transparent px-0">
              <TabsIndicator className="top-0 h-full translate-y-0 rounded-none" />
              <Tab value="pending">
                Pending{" "}
                <span className="ml-1 bg-white/20 px-1 text-xs">
                  {pendingOptimizations.length}
                </span>
              </Tab>
              <Tab value="in_progress">
                In Progress{" "}
                <span className="ml-1 bg-white/20 px-1 text-xs">
                  {inProgressOptimizations.length}
                </span>
              </Tab>
              <Tab value="published">Published</Tab>
              <Tab value="dismissed">Dismissed</Tab>
            </TabsList>

            <TabsPanel value="pending">
              {pendingOptimizations.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-medium text-base text-foreground">
                    No pending optimizations
                  </p>
                  <p className="font-light text-foreground-dimmed text-xs">
                    Run a simulation to generate new optimization suggestions.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {pendingOptimizations.map((optimization) => (
                    <OptimizationCard
                      key={optimization._id}
                      optimization={optimization}
                    />
                  ))}
                </div>
              )}
            </TabsPanel>

            <TabsPanel value="in_progress">
              <div className="flex flex-col gap-3">
                {inProgressOptimizations.map((optimization) => (
                  <div
                    key={optimization._id}
                    className="border border-primary/20 bg-primary/5 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-base text-foreground">
                          {optimization.productTitle}
                        </p>
                        <p className="font-light text-foreground-dimmed text-xs">
                          Publishing to Shopify...
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-24 bg-accent-foreground">
                          <div className="h-full w-2/3 animate-pulse bg-primary" />
                        </div>
                        <span className="font-light text-foreground-dimmed text-xs">
                          67%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsPanel>

            <TabsPanel value="published">
              <div className="flex flex-col gap-3">
                {publishedOptimizations.map((optimization) => (
                  <div
                    key={optimization._id}
                    className="border border-accent-foreground bg-background p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-base text-foreground">
                          {optimization.productTitle}
                        </p>
                        <div className="mt-1 flex items-center gap-3">
                          <span className="border border-accent-foreground px-1.5 py-0.5 text-foreground-dimmed text-xs">
                            {typeLabel(optimization.type)}
                          </span>
                          <span className="font-light text-foreground-dimmed text-xs">
                            {optimization.publishedAt}
                          </span>
                        </div>
                        {"winRateBefore" in optimization &&
                          optimization.winRateBefore && (
                            <p className="mt-1 font-light text-foreground-dimmed text-xs">
                              Win rate: {optimization.winRateBefore}% →{" "}
                              <span className="font-medium text-foreground">
                                {optimization.winRateAfter}%
                              </span>{" "}
                              <span className="font-medium text-success">
                                (+
                                {(optimization.winRateAfter ?? 0) -
                                  optimization.winRateBefore}
                                %)
                              </span>
                            </p>
                          )}
                      </div>
                      <button
                        type="button"
                        className="border border-accent-foreground px-2.5 py-1 text-foreground-dimmed text-xs transition-colors hover:bg-background-dimmed"
                      >
                        Rollback
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsPanel>

            <TabsPanel value="dismissed">
              <div className="flex flex-col gap-3">
                {dismissedOptimizations.map((optimization) => (
                  <div
                    key={optimization._id}
                    className="border border-accent-foreground bg-background p-4 opacity-60"
                  >
                    <div className="flex items-center justify-between">
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
                        className="border border-accent-foreground bg-background px-2.5 py-1 text-foreground text-xs transition-colors hover:bg-background-dimmed"
                      >
                        Reconsider
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsPanel>
          </Tabs>
        </div>
      </div>
    </div>
  </div>
);
