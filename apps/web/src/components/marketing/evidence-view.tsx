"use client";

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
import {
  Tooltip,
  TooltipPopup,
  TooltipPositioner,
  TooltipTrigger,
} from "@zenncore/web/components/tooltip";
import { type ReactNode, useId, useState } from "react";
import { Link } from "@/i18n/navigation";
import { fonts } from "./fonts";

export const EvidenceView = ({
  id,
  title,
  columns,
  rows,
  action,
  children,
}: EvidenceView.Props) => {
  const [table, setTable] = useState(false);

  return (
    <div>
      <div id={`${id}-view`}>
        {table ? (
          <div className="overflow-x-auto py-4">
            <Table aria-label={title} className="bg-background text-sm">
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead
                      key={column}
                      scope="col"
                      className="whitespace-normal px-3 py-3 font-medium text-foreground-rich text-sm normal-case tracking-normal first:pl-0 last:pr-0"
                    >
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.join("\u001f")}>
                    {row.map((value, position) =>
                      position === 0 ? (
                        <TableHead
                          key={columns[position]}
                          scope="row"
                          className="min-w-40 whitespace-normal py-4 pr-3 pl-0 font-medium text-foreground-rich text-sm normal-case tracking-normal"
                        >
                          {value}
                        </TableHead>
                      ) : (
                        <TableCell
                          key={columns[position]}
                          className="px-3 py-4 font-normal text-foreground text-sm last:pr-0"
                        >
                          {value.startsWith("https://") ? (
                            <Link
                              href={value}
                              className="break-all underline decoration-accent-foreground underline-offset-4 hover:text-primary-text"
                            >
                              {value}
                            </Link>
                          ) : (
                            value
                          )}
                        </TableCell>
                      ),
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          children
        )}
      </div>
      <Button
        variant="outline"
        color="primary"
        aria-controls={`${id}-view`}
        aria-pressed={table}
        onClick={() => setTable((current) => !current)}
        className="mt-5 min-h-11 rounded-xs border-accent-foreground bg-transparent px-3 py-2 font-normal text-foreground text-sm hover:bg-background-dimmed focus-visible:outline-2 focus-visible:outline-primary-text focus-visible:outline-offset-4"
      >
        {table ? action.secondary : action.primary}
      </Button>
    </div>
  );
};

export namespace EvidenceView {
  export type Props = {
    id: string;
    title: string;
    columns: readonly string[];
    rows: readonly (readonly string[])[];
    action: { primary: string; secondary: string };
    children: ReactNode;
  };
}

export const EvidenceDatum = ({
  detail,
  source,
  children,
}: EvidenceDatum.Props) => {
  const description = useId();

  return (
    <Tooltip>
      <TooltipTrigger
        aria-describedby={description}
        className="block h-auto w-full min-w-0 cursor-help rounded-xs px-0 py-4 text-left text-foreground hover:bg-transparent focus-visible:bg-transparent focus-visible:outline-2 focus-visible:outline-primary-text focus-visible:outline-offset-4 active:bg-transparent data-popup-open:bg-transparent"
      >
        {children}
      </TooltipTrigger>
      <TooltipPositioner keepMounted side="top" align="start" className="z-100">
        <TooltipPopup
          id={description}
          role="tooltip"
          className={cn(
            fonts,
            "max-w-[min(360px,calc(100vw-32px))] gap-2 rounded-xs border-accent-foreground bg-background-rich px-4 py-3 font-body text-foreground text-sm leading-relaxed shadow-sm [font-synthesis:none]",
          )}
        >
          <p>{detail}</p>
          <p className="text-foreground-dimmed">{source}</p>
        </TooltipPopup>
      </TooltipPositioner>
    </Tooltip>
  );
};

export namespace EvidenceDatum {
  export type Props = {
    detail: string;
    source: string;
    children: ReactNode;
  };
}

export const EvidenceMeter = ({
  label,
  value,
  percentage,
  detail,
  source,
  meta,
  pending,
}: EvidenceMeter.Props) => (
  <EvidenceDatum detail={detail} source={source}>
    <span className="block max-w-[42ch] font-medium text-base text-foreground-rich leading-snug">
      {label}
    </span>
    {meta && (
      <span className="mt-1 block text-foreground-dimmed text-sm">{meta}</span>
    )}
    {percentage === null ? (
      <span className="mt-5 block border-accent-foreground border-l pl-3 text-foreground-dimmed text-sm">
        {value}
      </span>
    ) : (
      <span className="relative mt-5 block h-7 pr-28">
        <svg
          width="100%"
          height="12"
          className="overflow-visible border-accent-foreground border-l text-primary"
          aria-hidden="true"
        >
          {percentage > 0 && (
            <>
              <rect
                width={`${percentage}%`}
                height="10"
                rx="2"
                fill="currentColor"
              />
              <rect width="2" height="10" fill="currentColor" />
            </>
          )}
        </svg>
        <span
          className="absolute -top-1 whitespace-nowrap font-medium text-base text-foreground-rich tabular-nums"
          style={{
            left: `calc((100% - 7rem) * ${percentage / 100} + 0.75rem)`,
          }}
        >
          {value}
        </span>
      </span>
    )}
    {pending && (
      <span className="mt-2 block text-foreground-dimmed text-sm">
        {pending}
      </span>
    )}
  </EvidenceDatum>
);

export namespace EvidenceMeter {
  export type Props = {
    label: string;
    value: string;
    percentage: number | null;
    detail: string;
    source: string;
    meta?: string;
    pending?: string;
  };
}
