import type { PaginationState } from "@zenncore/web/components/data-table";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useQueryTransition } from "@/components/query-transition";

export const usePaginationChangeHandler = (prefix = "") => {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Routes the navigation through the page's shared query transition (when a
  // provider is mounted), so page changes get the same pending fade as search
  // and filter applies. The context default is a pass-through.
  const { startTransition } = useQueryTransition();

  return useCallback(
    (pagination: PaginationState) => {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set(`${prefix}page`, pagination.pageIndex.toString());
      newSearchParams.set(`${prefix}size`, pagination.pageSize.toString());

      startTransition(() => router.push(`?${newSearchParams.toString()}`));
    },
    [router, searchParams, prefix, startTransition],
  );
};
