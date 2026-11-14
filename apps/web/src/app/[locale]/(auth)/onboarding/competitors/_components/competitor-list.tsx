"use client";

import { XIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@zenncore/web/components/avatar";
import { Button } from "@zenncore/web/components/button";
import { Checkbox } from "@zenncore/web/components/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import Image from "next/image";
import { useMessages, useTranslations } from "next-intl";
import { Motion } from "@/components/motion";
import { isVerifiedCompetitor } from "@/lib/competitor-source";
import { getCurrencySymbol, normalizePrice } from "@/lib/currency";
import { getBrandLogo } from "@/lib/logo";
import type * as Competitor from "@/server/app/competitor";

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
  const messages = useMessages();
  const translate = useTranslations("onboarding.experience");
  const tableHeaders = messages.onboarding.competitors.review.table.headers;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-background-rich">
        <Table className="min-w-128">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 px-4 py-2" />
              {tableHeaders.map((header) => (
                <TableHead key={header} className="normal-case tracking-normal">
                  {header}
                </TableHead>
              ))}
              <TableHead className="w-10 px-4 py-2" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {competitors.map((record) => (
              <TableRow
                key={record.id}
                render={<Motion.Row />}
                className={cn(
                  "last:border-b-0",
                  record.selected
                    ? "bg-primary/5"
                    : "opacity-60 hover:bg-background-dimmed/50",
                )}
              >
                <TableCell className="w-10">
                  <Checkbox
                    checked={record.selected}
                    onCheckedChange={() => onToggle(record.id)}
                    aria-label={translate("selectProduct", {
                      product: record.title,
                    })}
                    className="rounded-sm"
                  />
                </TableCell>
                <TableCell className="w-full max-w-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="aspect-square size-9 min-w-9 shrink-0 rounded-lg bg-primary/10">
                      <AvatarImage
                        src={
                          record.image ??
                          getBrandLogo(record.brand) ??
                          undefined
                        }
                        alt={record.title}
                        className="object-contain"
                      />
                      <AvatarFallback className="relative size-full min-h-9 min-w-9">
                        <Image src="/images/fallback.png" alt="" fill />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p
                        className="truncate font-medium text-foreground text-sm"
                        title={record.title}
                      >
                        {record.title}
                      </p>
                      {record.source && (
                        <p className="truncate text-foreground-dimmed text-xs">
                          {record.source}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {record.price && isVerifiedCompetitor(record.confidence)
                    ? normalizePrice(record.price)
                    : "\u2014"}
                </TableCell>
                <TableCell className="text-foreground-dimmed">
                  {record.currency
                    ? getCurrencySymbol(record.currency)
                    : "\u2014"}
                </TableCell>
                <TableCell className="text-foreground-dimmed">
                  {record.brand ?? "\u2014"}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    color="accent"
                    variant="ghost"
                    aria-label={translate("removeCompetitor", {
                      competitor: record.title,
                    })}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(record.id);
                    }}
                    className="size-8 p-0 text-foreground-dimmed hover:text-error"
                  >
                    <XIcon className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
