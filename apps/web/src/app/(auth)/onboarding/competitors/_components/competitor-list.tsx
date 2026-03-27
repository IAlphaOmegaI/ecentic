"use client";

import { CheckIcon, XIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@zenncore/web/components/avatar";
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
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-auto border-accent-foreground border-x bg-background-rich">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 px-4 py-2" />
              {["Competitor", "Price", "Brand"].map((header) => (
                <TableHead key={header}>{header}</TableHead>
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
                <TableCell className="w-10">
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
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9 rounded-none bg-primary/10">
                      <AvatarImage
                        src={record.image ?? "/images/fallback.png"}
                        alt={record.title}
                      />
                      <AvatarFallback className="relative">
                        <Image src="/images/fallback.png" alt="Fallback" fill />
                      </AvatarFallback>
                    </Avatar>
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
                <TableCell>
                  {formatPrice(record.price, record.currency)}
                </TableCell>
                <TableCell className="text-foreground-dimmed">
                  {record.brand ?? "\u2014"}
                </TableCell>
                <TableCell>
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
