import type { SearchParamValue } from "@zenncore/utils";

export type SearchParamsProps<T extends string> = {
  searchParams: Promise<{ [K in T]: SearchParamValue }>;
};
