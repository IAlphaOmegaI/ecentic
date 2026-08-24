import { cn } from "@zenncore/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import type { ReactNode } from "react";

/**
 * The primitives the four docs pages share. Everything a developer or an agent
 * reads here is server-rendered text — no client component sits between the
 * request and the reference, because the readers that matter most for this page
 * do not run JavaScript.
 */

export const DocsCode = ({ children, label }: DocsCode.Props) => (
  <figure className="flex flex-col gap-2">
    {label && (
      <figcaption className="font-mono text-foreground-dimmed text-xs">
        {label}
      </figcaption>
    )}
    <pre className="overflow-x-auto border border-accent-foreground bg-background-dimmed p-4 font-mono text-foreground text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  </figure>
);

export namespace DocsCode {
  export type Props = {
    children: string;
    label?: string;
  };
}

export const DocsTable = ({ columns, rows }: DocsTable.Props) => (
  <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column} className="whitespace-nowrap">
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
                  "align-top",
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
  </div>
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
