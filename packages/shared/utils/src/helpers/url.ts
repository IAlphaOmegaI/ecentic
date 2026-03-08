export type SearchParamValue = string | null | string[] | undefined;

export function parseSearchParam(
  searchParam: SearchParamValue,
  result: "single",
  fallback?: never,
): string | undefined;

export function parseSearchParam(
  searchParam: SearchParamValue,
  result: "single",
  fallback: string,
): string;

export function parseSearchParam(
  searchParam: SearchParamValue,
  result: "list",
  fallback?: never,
): string[] | undefined;

export function parseSearchParam(
  searchParam: SearchParamValue,
  result: "list",
  fallback: string[],
): string[];

export function parseSearchParam(
  searchParam: SearchParamValue,
  result: "single" | "list",
  fallback?: string | string[],
) {
  if (!searchParam) return fallback;
  switch (result) {
    case "single":
      return typeof searchParam === "string"
        ? searchParam
        : (searchParam?.[0] ?? fallback);
    case "list": {
      return typeof searchParam === "string" ? [searchParam] : searchParam;
    }
  }
}
