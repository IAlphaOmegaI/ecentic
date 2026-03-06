import { parseSearchParam } from "@zenncore/utils";
import type { SearchParamsProps } from "@zenncore/web/types";

export type Pager = {
  page: number;
  size: number;
};

export const extractPaginationParams = async (
  searchParams: SearchParamsProps<keyof Pager>["searchParams"],
) => {
  const query = await searchParams;

  const page = parseSearchParam(query.page, "single", 1);
  const size = parseSearchParam(query.size, "single", 20);

  return {
    page: Number.parseInt(page, 10),
    size: Number.parseInt(size, 10),
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
