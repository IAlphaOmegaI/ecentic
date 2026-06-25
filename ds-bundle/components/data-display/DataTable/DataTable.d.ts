import * as React from "react";

/**
 * DataTable — from @zenncore/web@0.0.0.
 */
export interface DataTableProps {
  className?: string;
  classList?: {
    "header-cell"?: string;
    "body-row"?: string;
    "body-cell"?: string;
  };
  children?: React.ReactNode;
}

export declare const DataTable: React.ComponentType<DataTableProps>;
