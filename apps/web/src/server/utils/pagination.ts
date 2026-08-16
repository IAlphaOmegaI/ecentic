import { parseSearchParam } from "@zenncore/utils";
import type { SearchParamsProps } from "@zenncore/web/types";

export type Pager = {
  page: number;
  size: number;
};

// URL input: a non-numeric or hostile value must not reach the OFFSET/LIMIT
// query (NaN breaks it) or request an unbounded page size.
const clampPaginationParam = (
  raw: string,
  fallback: number,
  maximum: number,
) => {
  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
};

export const extractPaginationParams = async (
  searchParams: SearchParamsProps<keyof Pager>["searchParams"],
) => {
  const query = await searchParams;

  const page = parseSearchParam(query.page, "single", "1");
  const size = parseSearchParam(query.size, "single", "20");

  return {
    page: clampPaginationParam(page, 1, Number.MAX_SAFE_INTEGER),
    size: clampPaginationParam(size, 20, 100),
  };
};

export type Paginated<T> = {
  items: T[];
  pagination: {
    total: number;
    page: number;
    size: number;
  };
};
