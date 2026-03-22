import type { PaginationState } from "@zenncore/web/components/data-table";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export const usePaginationChangeHandler = (prefix = "") => {
  const router = useRouter();
  const searchParams = useSearchParams();

  return useCallback(
    (pagination: PaginationState) => {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set(`${prefix}page`, pagination.pageIndex.toString());
      newSearchParams.set(`${prefix}size`, pagination.pageSize.toString());

      router.push(`?${newSearchParams.toString()}`);
    },
    [router, searchParams, prefix],
  );
};
