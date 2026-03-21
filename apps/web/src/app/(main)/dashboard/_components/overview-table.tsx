"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
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
import Link from "next/link";
import { Spring, Stagger, Table as TableAnimations } from "@/lib/animations";
import type { ProductRow } from "@/server/app/dashboard";

export const OverviewTable = ({ products }: { products: ProductRow[] }) => {
  if (products.length === 0) {
    return (
      <div className="bg-background p-8 text-center">
        <p className="font-medium text-base text-foreground">
          No products scanned yet
        </p>
        <p className="mt-1 font-light text-foreground-dimmed text-xs">
          Import products and run a simulation to see win rates here.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...Spring.Gentle, delay: 0.3 }}
    >
      <div className="flex items-center justify-between border-accent-foreground border-b px-4 py-3">
        <p className="font-medium text-base text-foreground">
          Product Win Rates
        </p>
        <Button
          variant="ghost"
          color="primary"
          render={<Link href="/dashboard/products" />}
        >
          View all products <ArrowRightIcon className="size-3" />
        </Button>
      </div>
      <div className="overflow-x-auto bg-background-rich">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Product",
                "Win Rate",
                "GPT-4",
                "Claude",
                "Gemini",
                "Top Competitor",
                "Quality",
                "",
              ].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody
            render={
              <motion.tbody
                variants={Stagger.Container(0.05)}
                initial="hidden"
                animate="visible"
                transition={{ delayChildren: 0.35 }}
              />
            }
          >
            {products.map((product) => (
              <TableRow
                key={product.id}
                render={<motion.tr variants={TableAnimations.Row} />}
                className="hover:bg-background-dimmed/50"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center bg-primary/10 font-semibold text-primary text-xs">
                      {product.title.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {product.title}
                      </p>
                      {product.price && (
                        <p className="font-light text-foreground-dimmed text-xs">
                          {product.currency === "USD" ? "$" : product.currency}
                          {product.price}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-16 bg-accent-foreground">
                      <motion.div
                        className={cn(
                          "h-full",
                          product.winRate >= 60
                            ? "bg-success"
                            : product.winRate >= 30
                              ? "bg-warning"
                              : "bg-error",
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${product.winRate}%` }}
                        transition={{ ...Spring.Gentle, delay: 0.4 }}
                      />
                    </div>
                    <span className="font-medium text-foreground text-xs">
                      {product.winRate}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-xs">{product.gpt4}%</TableCell>
                <TableCell className="text-xs">{product.claude}%</TableCell>
                <TableCell className="text-xs">{product.gemini}%</TableCell>
                <TableCell>
                  {product.topCompetitor ? (
                    <div>
                      <p className="font-light text-foreground-dimmed text-xs">
                        {product.topCompetitor.name}
                      </p>
                      <p
                        className={cn(
                          "font-medium text-xs",
                          product.winRate > product.topCompetitor.winRate
                            ? "text-success"
                            : "text-error",
                        )}
                      >
                        {product.winRate > product.topCompetitor.winRate
                          ? "+"
                          : ""}
                        {product.winRate - product.topCompetitor.winRate}%
                      </p>
                    </div>
                  ) : (
                    <span className="font-light text-foreground-dimmed text-xs">
                      —
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-10 bg-accent-foreground">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${product.quality}%` }}
                        transition={{ ...Spring.Gentle, delay: 0.5 }}
                      />
                    </div>
                    <span className="font-light text-foreground-dimmed text-xs">
                      {product.quality}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    color="primary"
                    render={<Link href={`/dashboard/products/${product.id}`} />}
                  >
                    View →
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
};
