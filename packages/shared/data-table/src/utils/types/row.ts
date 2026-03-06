import type { RowData } from "@tanstack/react-table";
import type { UniqueIdentifier } from "@zenncore/utils/types";

export type TableRow = AdditionalTableRowProperties & RowData;

export type AdditionalTableRowProperties = {
  _id: UniqueIdentifier;
  subrows?: TableRow[];
  href?: string;
};
