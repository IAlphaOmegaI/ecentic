import { cn } from "@zenncore/utils";
import { ScrollArea } from "@zenncore/web/components/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import { FormattedSource } from "@/components/marketing/interactive/published-files/formatted-source";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";
import { DocsCopy } from "./docs-copy";

/**
 * Shared reference content remains server-rendered. ScrollArea adds keyboard
 * scrolling after hydration without hiding code or table content from readers
 * that do not run JavaScript.
 */

export const DocsCode = async ({
  children,
  label,
  className,
  formatted = false,
  edges = "both",
}: DocsCode.Props) => {
  const { docsControls } = await getMessages();

  return (
    <figure
      data-docs-source
      className={cn(
        "relative flex min-w-0 flex-col border-accent-foreground bg-background-dimmed",
        (edges === "both" || edges === "top") && "border-t",
        (edges === "both" || edges === "bottom") && "border-b",
        className,
      )}
    >
      {(edges === "both" || edges === "top") && <MarketingEdgeCrosses />}
      {(edges === "both" || edges === "bottom") && (
        <MarketingEdgeCrosses edge="bottom" />
      )}
      <figcaption className="flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-b px-4 py-2">
        <span className="wrap-anywhere text-foreground-dimmed text-sm">
          {label ?? docsControls.snippet}
        </span>
        <DocsCopy source={children} copy={docsControls} />
      </figcaption>
      <ScrollArea
        className="min-h-0 max-w-full flex-1"
        viewportProps={{
          role: "region",
          tabIndex: 0,
          "aria-label": label ?? docsControls.snippet,
        }}
        classList={{
          viewport:
            "overscroll-y-auto focus-visible:outline-2 focus-visible:outline-primary-text",
        }}
      >
        {formatted ? (
          <FormattedSource source={children} />
        ) : (
          <pre className="w-max min-w-full p-4 font-mono text-foreground text-xs leading-relaxed">
            <code>{children}</code>
          </pre>
        )}
      </ScrollArea>
    </figure>
  );
};

export namespace DocsCode {
  export type Props = {
    children: string;
    label?: string;
    className?: string;
    /** Line-numbered syntax treatment for full dark source workbenches. */
    formatted?: boolean;
    /** Only draw boundaries owned by this document, never the surrounding cell. */
    edges?: "both" | "top" | "bottom" | "none";
  };
}

export const DocsTable = ({ columns, rows }: DocsTable.Props) => (
  <ScrollArea
    className="min-w-0 max-w-full"
    viewportProps={{
      role: "region",
      tabIndex: 0,
      "aria-label": columns.join(", "),
    }}
    classList={{
      viewport:
        "overscroll-y-auto focus-visible:outline-2 focus-visible:outline-primary-text",
    }}
  >
    <Table className="min-w-160 border-b-0 bg-background">
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead
              key={column}
              className="whitespace-nowrap px-7 font-medium text-foreground text-sm normal-case tracking-normal max-sm:px-4"
            >
              {column}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            {row.cells.map((cell, index) => (
              <TableCell
                // biome-ignore lint/suspicious/noArrayIndexKey: column order is fixed per table
                key={index}
                className={cn(
                  "px-7 align-top font-normal max-sm:px-4",
                  cell.mono && "whitespace-nowrap font-mono text-xs",
                )}
              >
                {cell.content}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </ScrollArea>
);

export namespace DocsTable {
  export type Cell = {
    content: ReactNode;
    /** Code-like values (paths, headers, status codes) render monospaced. */
    mono?: boolean;
  };

  export type Row = {
    key: string;
    cells: readonly Cell[];
  };

  export type Props = {
    columns: readonly string[];
    rows: readonly Row[];
  };
}

/**
 * A named anchor a problem `type` URI can point at. The id is the error code,
 * so `…/docs/errors#rate-limited` lands on the row that documents it.
 */
export const DocsAnchor = ({ id, children }: DocsAnchor.Props) => (
  <span id={id} className="scroll-mt-28">
    {children}
  </span>
);

export namespace DocsAnchor {
  export type Props = {
    id: string;
    children: ReactNode;
  };
}
