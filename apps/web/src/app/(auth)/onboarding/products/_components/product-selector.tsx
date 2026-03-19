"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  LoaderIcon,
} from "@zenncore/icons";
import { cn, resultify, unique } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { motion } from "motion/react";
import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { Motion } from "@/components/motion";
import { Image } from "@/components/ui/image";
import { Stagger } from "@/lib/animations";
import type * as Product from "@/server/app/product";

const limit = 10;

const parseImages = (images: string | null): string[] => {
  if (!images) return [];

  const result = resultify(() => {
    const parsed = JSON.parse(images ?? "[]");
    if (Array.isArray(parsed)) return parsed;
    return [];
  });

  if (!result.success) return [];
  return result.data;
};

const computeDataQuality = (product: Product.Type): number => {
  const checks = [
    [product.title, 20],
    [product.description, 20],
    [product.price, 15],
    [parseImages(product.images).length > 0, 15],
    [product.sku, 10],
    [product.url, 10],
    [product.compareAtPrice, 10],
  ] as const;

  return checks.reduce(
    (score, [value, weight]) => score + (value ? weight : 0),
    0,
  );
};

const formatPrice = (price: string | null, currency: string | null): string => {
  if (!price) return "\u2014";

  const symbol = (() => {
    switch (currency?.toUpperCase()) {
      case "EUR":
        return "\u20AC";
      case "GBP":
        return "\u00A3";
      default:
        return "$";
    }
  })();

  return `${symbol}${price}`;
};

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

export namespace ProductSelector {
  export type Props = {
    children: ReactNode;
    products: Product.Type[];
  };
}

export const ProductSelector = ({
  children,
  products,
}: ProductSelector.Props) => {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleAll = () => {
    setSelected((previous) => {
      if (previous.size === products.length) return new Set();
      return new Set(products.slice(0, limit).map((product) => product.id));
    });
  };

  const toggleProduct = (id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= limit) return previous;
      next.add(id);
      return next;
    });
  };

  const handleNext = () => {
    const selection =
      selected.size > 0
        ? selected
        : unique(products.slice(0, limit).map((product) => product.id));

    const params = new URLSearchParams();

    for (const product of selection) params.append("products", product);
    router.push(`/onboarding/competitors?${params.toString()}`);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mx-8 flex flex-1 flex-col border-x border-accent-foreground">
        {/* Title section */}
        <div className="px-6 py-8">
          {children}
          <div className="mt-4 inline-flex items-center border border-primary/20 bg-primary/5 px-3 py-1.5 text-primary text-sm">
            {selected.size} of {limit} products selected
          </div>
        </div>

        {/* Table — crossing borders */}
        <div className="-mx-8 flex-1 overflow-hidden border-y border-accent-foreground">
          <div className="mx-8 h-full overflow-auto">
            <div className="bg-background-rich">
              <Table className="w-full [&_td:first-child]:border-l-0 [&_td:last-child]:border-r-0 [&_th:first-child]:border-l-0 [&_th:last-child]:border-r-0">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 px-4 py-2">
                      <button
                        type="button"
                        onClick={toggleAll}
                        className={cn(
                          "flex size-4 cursor-pointer items-center justify-center border transition-colors duration-150",
                          selected.size === products.length
                            ? "border-primary bg-primary"
                            : "border-accent-foreground bg-background-rich",
                        )}
                      >
                        <CheckIcon
                          className={cn(
                            "size-2.5 text-white transition-opacity duration-150",
                            selected.size === products.length
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                      </button>
                    </TableHead>
                    {["Product", "Price", "Status", "Quality"].map((header) => (
                      <TableHead
                        key={header}
                        className="px-4 py-3 text-left font-medium text-foreground text-sm"
                      >
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody
                  render={
                    <motion.tbody
                      variants={Stagger.Container(0.04)}
                      initial="hidden"
                      animate="visible"
                    />
                  }
                >
                  {products.map((product) => {
                    const isSelected = selected.has(product.id);
                    const isDisabled = !isSelected && selected.size >= limit;
                    const images = parseImages(product.images);
                    const quality = computeDataQuality(product);

                    return (
                      <TableRow
                        key={product.id}
                        render={<motion.tr variants={Stagger.Item} />}
                        onClick={() => !isDisabled && toggleProduct(product.id)}
                        className={cn(
                          "cursor-pointer last:border-b-0",
                          isSelected
                            ? "bg-primary/5"
                            : isDisabled
                              ? "cursor-not-allowed opacity-40"
                              : "hover:bg-background-dimmed/50",
                        )}
                      >
                        <TableCell className="w-10 px-4 py-3">
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
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Image
                              src={images[0] ?? "/images/placeholder.svg"}
                              unoptimized
                              alt={product.title.slice(0, 2).toUpperCase()}
                              className="size-9 shrink-0 object-cover"
                            />
                            <div>
                              <p className="font-medium text-foreground text-sm">
                                {product.title}
                              </p>
                              {product.sku && (
                                <p className="text-foreground-dimmed text-xs">
                                  {product.sku}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 font-light text-foreground text-sm">
                          {formatPrice(product.price, product.currency)}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 font-medium text-xs",
                              product.status === "active"
                                ? "bg-success/10 text-success"
                                : "bg-foreground-dimmed/10 text-foreground-dimmed",
                            )}
                          >
                            {product.status === "active" ? "Active" : "Draft"}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <QualityBadge score={quality} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-6">
          <Button
            variant="outline"
            color="accent"
            type="button"
            className="text-foreground-dimmed text-sm"
            render={<Link href="/onboarding/connect" />}
          >
            <Back />
          </Button>
          <Button
            variant="flat"
            color="primary"
            type="button"
            onClick={handleNext}
            disabled={selected.size === 0}
            className="px-6 py-2 font-medium text-sm"
          >
            <Next />
          </Button>
        </div>
      </div>
    </div>
  );
};

const Back = () => {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowLeftIcon className="size-4" />
      )}
      Back
    </>
  );
};

const Next = () => {
  const { pending } = useLinkStatus();
  return (
    <>
      Next: Add Competitors
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowRightIcon className="size-4" />
      )}
    </>
  );
};
