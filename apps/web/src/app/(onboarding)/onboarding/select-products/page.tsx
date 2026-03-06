"use client";

import { CheckIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { cn } from "@zenncore/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { products } from "@/lib/mock-data";

const PRODUCT_LIMIT = 10;

const QualityBadge = ({ score }: { score: number }) => {
  const color = (() => {
    switch (true) {
      case score >= 75:
        return "text-success bg-success/10";
      case score >= 50:
        return "text-warning bg-warning/10";
      default:
        return "text-error bg-error/10";
    }
  })();

  const label = (() => {
    switch (true) {
      case score >= 75:
        return "Good";
      case score >= 50:
        return "Partial";
      default:
        return "Poor";
    }
  })();

  return (
    <span className={cn("px-1.5 py-0.5 text-xs font-medium", color)}>
      {label}
    </span>
  );
};

export default () => {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleProduct = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= PRODUCT_LIMIT) return previous;
      next.add(id);
      return next;
    });
  };

  const handleNext = () => {
    const selection =
      selectedIds.size > 0
        ? selectedIds
        : new Set(products.slice(0, PRODUCT_LIMIT).map((product) => product._id));
    void selection;
    router.push("/onboarding/competitors");
  };

  return (
    <div className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6">
          <div className="mb-1 flex items-center gap-2">
            <h1 className="font-medium text-2xl text-foreground">
              Choose products to scan
            </h1>
            <span className="border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary text-xs">
              Free: {PRODUCT_LIMIT} products
            </span>
          </div>
          <p className="font-light text-foreground-dimmed text-sm">
            Select the products you want to test against AI shopping agents. We
            recommend starting with your best sellers.
          </p>
        </div>

        {selectedIds.size > 0 && (
          <div className="mb-4 border border-primary/20 bg-primary/5 px-4 py-2.5 text-primary text-sm">
            {selectedIds.size} of {PRODUCT_LIMIT} products selected
          </div>
        )}

        <div className="border border-accent-foreground bg-background-rich">
          <div className="grid grid-cols-[auto_1fr_80px_80px_80px_90px] gap-0 border-accent-foreground border-b bg-background-dimmed px-4 py-2 text-foreground-dimmed text-xs font-medium">
            <div className="pr-3" />
            <div>Product</div>
            <div className="text-right">Price</div>
            <div className="text-right">Category</div>
            <div className="text-right">Quality</div>
            <div className="text-right">Variants</div>
          </div>
          {products.map((product) => {
            const isSelected = selectedIds.has(product._id);
            const isDisabled = !isSelected && selectedIds.size >= PRODUCT_LIMIT;

            return (
              <button
                key={product._id}
                type="button"
                onClick={() => toggleProduct(product._id)}
                disabled={isDisabled}
                className={cn(
                  "grid w-full grid-cols-[auto_1fr_80px_80px_80px_90px] items-center gap-0 border-accent-foreground border-b px-4 py-3 text-left transition-colors last:border-b-0",
                  isSelected
                    ? "bg-primary/5"
                    : isDisabled
                      ? "opacity-40"
                      : "hover:bg-background-dimmed/50",
                )}
              >
                <div className="pr-3">
                  <div
                    className={cn(
                      "flex size-4 items-center justify-center border",
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-accent-foreground bg-background-rich",
                    )}
                  >
                    {isSelected && (
                      <CheckIcon className="size-2.5 text-white" />
                    )}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {product.title}
                  </p>
                  <p className="text-foreground-dimmed text-xs">{product.sku}</p>
                </div>
                <div className="text-right font-light text-foreground text-sm">
                  ${product.price}
                </div>
                <div className="text-right font-light text-foreground-dimmed text-xs">
                  {product.category}
                </div>
                <div className="flex justify-end">
                  <QualityBadge score={product.dataQuality} />
                </div>
                <div className="text-right font-light text-foreground-dimmed text-xs">
                  1
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            color="neutral"
            type="button"
            className="text-foreground-dimmed text-sm"
            render={<Link href="/onboarding/connect" />}
          >
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              color="neutral"
              type="button"
              onClick={handleNext}
              className="text-foreground-dimmed text-sm"
            >
              Skip — auto-select top 10
            </Button>
            <Button
              variant="flat"
              color="primary"
              type="button"
              onClick={handleNext}
              disabled={selectedIds.size === 0}
              className="px-6 py-2 text-sm font-medium"
            >
              Next: Add Competitors
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
