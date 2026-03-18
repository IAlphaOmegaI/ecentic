"use client";

import { CheckIcon, XIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { motion } from "motion/react";
import { Stagger } from "@/lib/animations";
import type * as Competitor from "@/server/app/competitor";

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

export namespace CompetitorList {
  export type Props = {
    competitors: Competitor.Type[];
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
  };
}

export const CompetitorList = ({
  competitors,
  onToggle,
  onRemove,
}: CompetitorList.Props) => {
  const selected = competitors.filter((record) => record.selected).length;
  const brands = new Set(
    competitors.map((record) => record.brand).filter(Boolean),
  );

  return (
    <div>
      <div className="mb-4 border border-primary/20 bg-primary/5 px-4 py-2.5 text-primary text-sm">
        {competitors.length} competitor products across {brands.size} brands —{" "}
        {selected} selected
      </div>

      <div className="overflow-x-auto border border-accent-foreground bg-background-rich">
        <Table className="[&_td:first-child]:border-l-0 [&_td:last-child]:border-r-0 [&_th:first-child]:border-l-0 [&_th:last-child]:border-r-0">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 px-4 py-2" />
              {["Competitor", "Price", "Brand"].map((header) => (
                <TableHead
                  key={header}
                  className="px-4 py-2 text-left font-medium text-foreground-dimmed text-xs"
                >
                  {header}
                </TableHead>
              ))}
              <TableHead className="w-10 px-4 py-2" />
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
            {competitors.map((record) => (
              <TableRow
                key={record.id}
                render={<motion.tr variants={Stagger.Item} />}
                onClick={() => onToggle(record.id)}
                className={cn(
                  "cursor-pointer last:border-b-0",
                  record.selected
                    ? "bg-primary/5"
                    : "opacity-60 hover:bg-background-dimmed/50",
                )}
              >
                <TableCell className="w-10 px-4 py-3">
                  <div
                    className={cn(
                      "flex size-4 items-center justify-center border transition-colors duration-150",
                      record.selected
                        ? "border-primary bg-primary"
                        : "border-accent-foreground bg-background-rich",
                    )}
                  >
                    <CheckIcon
                      className={cn(
                        "size-2.5 text-white transition-opacity duration-150",
                        record.selected ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {record.image ? (
                      // biome-ignore lint/performance/noImgElement: external image domains unknown
                      <img
                        src={record.image}
                        alt={record.title}
                        className="size-9 shrink-0 object-cover"
                      />
                    ) : (
                      <div className="flex size-9 shrink-0 items-center justify-center bg-primary/10 font-semibold text-primary text-xs">
                        {record.title.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {record.title}
                      </p>
                      {record.source && (
                        <p className="text-foreground-dimmed text-xs">
                          {record.source}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 font-light text-foreground text-sm">
                  {formatPrice(record.price, record.currency)}
                </TableCell>
                <TableCell className="px-4 py-3 text-foreground-dimmed text-sm">
                  {record.brand ?? "\u2014"}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(record.id);
                    }}
                    className="text-foreground-dimmed transition-colors hover:text-error"
                  >
                    <XIcon className="size-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
