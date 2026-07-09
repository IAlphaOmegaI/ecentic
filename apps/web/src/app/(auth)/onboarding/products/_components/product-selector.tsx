"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  LoaderIcon,
} from "@zenncore/icons";
import { cn, resultify, unique } from "@zenncore/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@zenncore/web/components/avatar";
import { Button } from "@zenncore/web/components/button";
import { ScrollArea } from "@zenncore/web/components/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { motion } from "motion/react";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import { Stagger, Table as TableAnimations } from "@/lib/animations";
import { getCurrencySymbol, normalizePrice } from "@/lib/currency";
import type * as Product from "@/server/app/product";

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
  const [selected, setSelected] = useState(new Set<string>());

  const limit = Math.min(10, products.length);

  // Select-all toggle removed — selection is per-row only.
  // const toggleAll = () => {
  //   setSelected((previous) => {
  //     if (previous.size === products.length) return new Set();
  //     return new Set(products.slice(0, limit).map((product) => product.id));
  //   });
  // };

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

  const [isPending, startTransition] = useTransition();

  const handleNext = () => {
    startTransition(() => {
      const selection =
        selected.size > 0
          ? selected
          : unique(products.slice(0, limit).map((product) => product.id));

      const params = new URLSearchParams();

      for (const product of selection) params.append("products", product);
      router.push(`/onboarding/competitors?${params.toString()}`);
    });
  };

  return (
    <Motion.Stagger className="flex flex-1 flex-col overflow-hidden">
      <Motion.Item className="px-8">
        <div className="relative border-accent-foreground border-x p-6">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          {children}
          <div className="mt-4 inline-flex items-center border border-primary/20 bg-primary/5 px-3 py-1.5 text-primary text-sm">
            {selected.size} of {limit} products selected
          </div>
        </div>
      </Motion.Item>

      <Motion.Item className="flex-1 overflow-hidden border-accent-foreground border-y px-8">
        <div className="relative h-full border-accent-foreground border-x">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <ScrollArea className="h-full">
            <div className="bg-background-rich">
              {/* overflow-visible stops the <table> from becoming its own scroll
                container, so the sticky header anchors to the ScrollArea
                viewport instead. */}
              <Table className="overflow-visible">
                {/* Border via inset box-shadow on the cells (not `border-b`): with
                  border-collapse, a collapsed thead border scrolls away with the
                  body, whereas a cell box-shadow stays pinned to the sticky
                  header. Background also lives on the cells so rows never show
                  through the forced-transparent header row. */}
                <TableHeader className="sticky top-0 z-10 [&_th]:bg-background-rich [&_th]:shadow-[inset_0_-1px_0_0_var(--color-accent-foreground)]">
                  <TableRow className="border-b-0">
                    {/* Empty placeholder keeps the checkbox column aligned with
                      the per-row selection cells now that the select-all toggle
                      is removed. */}
                    <TableHead className="w-10 px-4 py-2">
                      {/* <button
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
                    </button> */}
                    </TableHead>
                    {["Product", "Price", "Currency", "Status", "Quality"].map(
                      (header) => (
                        <TableHead key={header}>{header}</TableHead>
                      ),
                    )}
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
                        render={<motion.tr variants={TableAnimations.Row} />}
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
                        <TableCell className="w-10">
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
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9 min-w-9 rounded-none bg-primary/10">
                              <AvatarImage
                                src={images[0] ?? "/images/fallback.png"}
                                alt={product.title}
                              />
                              <AvatarFallback className="relative">
                                <Image
                                  src="/images/fallback.png"
                                  alt="Fallback"
                                  fill
                                />
                              </AvatarFallback>
                            </Avatar>
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
                        <TableCell>
                          {product.price
                            ? normalizePrice(product.price)
                            : "\u2014"}
                        </TableCell>
                        <TableCell className="text-foreground-dimmed">
                          {product.currency
                            ? getCurrencySymbol(product.currency)
                            : "\u2014"}
                        </TableCell>
                        <TableCell>
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
                        <TableCell>
                          <QualityBadge score={quality} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
      </Motion.Item>

      <Motion.Item className="px-8">
        <div className="relative flex w-full items-center justify-between border-accent-foreground border-x p-6">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <Button
            color="accent"
            type="button"
            render={<Link href="/onboarding/connect" />}
          >
            <Back />
          </Button>
          <Button
            color="primary"
            type="button"
            onClick={handleNext}
            disabled={selected.size === 0}
            className="px-6 py-2"
          >
            Next: Add Competitors
            {isPending ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <ArrowRightIcon className="size-4" />
            )}
          </Button>
        </div>
      </Motion.Item>
    </Motion.Stagger>
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
