"use client";

import { CheckIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Motion } from "@/components/motion";
import { Scale, Spring, Stagger } from "@/lib/animations";
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
    <span className={cn("px-1.5 py-0.5 font-medium text-xs", color)}>
      {label}
    </span>
  );
};

export default () => {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleAll = () => {
    setSelectedIds((previous) => {
      if (previous.size === products.length) return new Set();
      return new Set(products.slice(0, PRODUCT_LIMIT).map((p) => p._id));
    });
  };

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
        : new Set(
            products.slice(0, PRODUCT_LIMIT).map((product) => product._id),
          );
    void selection;
    router.push("/onboarding/competitors");
  };

  return (
    <Motion.Stagger stagger={0.05} className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Motion.Up className="mb-6">
          <div className="mb-1 flex items-center gap-2">
            <h1 className="font-medium text-2xl text-foreground">
              Choose products to scan
            </h1>
            <motion.span
              className="border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary text-xs"
              variants={Scale.In}
            >
              Free: {PRODUCT_LIMIT} products
            </motion.span>
          </div>
          <p className="font-light text-foreground-dimmed text-sm">
            Select the products you want to test against AI shopping agents. We
            recommend starting with your best sellers.
          </p>
        </Motion.Up>

        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              className="mb-4 border border-primary/20 bg-primary/5 px-4 py-2.5 text-primary text-sm"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={Spring.Snappy}
            >
              {selectedIds.size} of {PRODUCT_LIMIT} products selected
            </motion.div>
          )}
        </AnimatePresence>

        <Motion.Up className="overflow-x-auto border border-accent-foreground bg-background-rich">
          <table className="w-full border-collapse [&_td:first-child]:border-l-0 [&_td:last-child]:border-r-0 [&_td]:border-accent-foreground [&_td]:border-x [&_th:first-child]:border-l-0 [&_th:last-child]:border-r-0 [&_th]:border-accent-foreground [&_th]:border-x">
            <thead>
              <tr className="border-accent-foreground border-b">
                <th className="w-10 px-4 py-2">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className={cn(
                      "flex size-4 cursor-pointer items-center justify-center border transition-colors duration-150",
                      selectedIds.size === products.length
                        ? "border-primary bg-primary"
                        : "border-accent-foreground bg-background-rich",
                    )}
                  >
                    <CheckIcon
                      className={cn(
                        "size-2.5 text-white transition-opacity duration-150",
                        selectedIds.size === products.length
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                  </button>
                </th>
                {["Product", "Price", "Category", "Quality", "Variants"].map(
                  (header) => (
                    <th
                      key={header}
                      className="px-4 py-2 text-left font-medium text-foreground-dimmed text-xs"
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <motion.tbody
              variants={Stagger.Container(0.04)}
              initial="hidden"
              animate="visible"
            >
              {products.map((product) => {
                const isSelected = selectedIds.has(product._id);
                const isDisabled =
                  !isSelected && selectedIds.size >= PRODUCT_LIMIT;

                return (
                  <motion.tr
                    key={product._id}
                    variants={Stagger.Item}
                    onClick={() => !isDisabled && toggleProduct(product._id)}
                    className={cn(
                      "cursor-pointer border-accent-foreground border-b transition-colors last:border-b-0",
                      isSelected
                        ? "bg-primary/5"
                        : isDisabled
                          ? "cursor-not-allowed opacity-40"
                          : "hover:bg-background-dimmed/50",
                    )}
                  >
                    <td className="w-10 px-4 py-3">
                      <div
                        className={cn(
                          "flex size-4 items-center justify-center border transition-colors duration-150",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-accent-foreground bg-background-rich",
                        )}
                      >
                        <CheckIcon
                          className={cn(
                            "size-2.5 text-white transition-opacity duration-150",
                            isSelected ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center bg-primary/10 font-semibold text-primary text-xs">
                          {product.title.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {product.title}
                          </p>
                          <p className="text-foreground-dimmed text-xs">
                            {product.sku}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-light text-foreground text-sm">
                      ${product.price}
                    </td>
                    <td className="px-4 py-3 font-light text-foreground-dimmed text-xs">
                      {product.category}
                    </td>
                    <td className="px-4 py-3">
                      <QualityBadge score={product.dataQuality} />
                    </td>
                    <td className="px-4 py-3 font-light text-foreground-dimmed text-xs">
                      1
                    </td>
                  </motion.tr>
                );
              })}
            </motion.tbody>
          </table>
        </Motion.Up>

        <Motion.Up className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            color="neutral"
            type="button"
            className="text-foreground-dimmed text-sm"
            render={<Link href="/onboarding/connect" />}
          >
            Back
          </Button>
          <Motion.Tap whileHover={{ y: -1 }} transition={Spring.Snappy}>
            <Button
              variant="flat"
              color="primary"
              type="button"
              onClick={handleNext}
              disabled={selectedIds.size === 0}
              className="px-6 py-2 font-medium text-sm"
            >
              Next: Add Competitors
            </Button>
          </Motion.Tap>
        </Motion.Up>
      </div>
    </Motion.Stagger>
  );
};
