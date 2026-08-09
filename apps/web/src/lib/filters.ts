import { resultify } from "@zenncore/utils";

/**
 * Product catalog filter model, shared by the filter-builder UI and the
 * server-side query builder. Filters travel in the `filters` search param as a
 * JSON array, and server actions are callable with arbitrary arguments, so
 * both sides run every incoming array through {@link sanitizeProductFilters} —
 * the shape is user-editable input, never trusted.
 */

export const PRODUCT_FILTER_FIELDS = {
  title: "text",
  description: "text",
  sku: "text",
  price: "number",
  status: "text",
  url: "text",
} as const;

export type ProductFilterField = keyof typeof PRODUCT_FILTER_FIELDS;

const TEXT_OPERATORS = [
  "contains",
  "notContains",
  "is",
  "isNot",
  "isEmpty",
  "isNotEmpty",
] as const;

const NUMBER_OPERATORS = [
  "equals",
  "greaterThan",
  "lessThan",
  "isEmpty",
  "isNotEmpty",
] as const;

export type ProductFilterOperator =
  | (typeof TEXT_OPERATORS)[number]
  | (typeof NUMBER_OPERATORS)[number];

export type ProductFilter = {
  field: ProductFilterField;
  operator: ProductFilterOperator;
  value?: string;
};

export const operatorsForField = (
  field: ProductFilterField,
): readonly ProductFilterOperator[] =>
  PRODUCT_FILTER_FIELDS[field] === "number" ? NUMBER_OPERATORS : TEXT_OPERATORS;

export const operatorNeedsValue = (operator: ProductFilterOperator) =>
  operator !== "isEmpty" && operator !== "isNotEmpty";

export const isProductFilterField = (
  value: string | null,
): value is ProductFilterField =>
  value !== null && value in PRODUCT_FILTER_FIELDS;

const isProductFilter = (entry: unknown): entry is ProductFilter => {
  if (typeof entry !== "object" || entry === null) return false;

  const { field, operator, value } = entry as Record<string, unknown>;

  if (typeof field !== "string" || !isProductFilterField(field)) return false;

  const operators: readonly string[] = operatorsForField(field);
  if (typeof operator !== "string" || !operators.includes(operator))
    return false;

  if (!operatorNeedsValue(operator as ProductFilterOperator)) return true;
  if (typeof value !== "string" || value.trim() === "") return false;

  return PRODUCT_FILTER_FIELDS[field] === "number"
    ? Number.isFinite(Number(value))
    : true;
};

/** Keeps only well-formed filters and strips values off valueless operators. */
export const sanitizeProductFilters = (filters: unknown): ProductFilter[] => {
  if (!Array.isArray(filters)) return [];

  return filters.filter(isProductFilter).map((filter) =>
    operatorNeedsValue(filter.operator)
      ? {
          field: filter.field,
          operator: filter.operator,
          value: filter.value,
        }
      : { field: filter.field, operator: filter.operator },
  );
};

export const parseProductFilters = (
  raw: string | undefined,
): ProductFilter[] => {
  if (!raw) return [];

  const parsed = resultify(() => JSON.parse(raw) as unknown);
  if (!parsed.success) return [];

  return sanitizeProductFilters(parsed.data);
};

export const serializeProductFilters = (filters: ProductFilter[]) =>
  filters.length > 0 ? JSON.stringify(filters) : undefined;

/** Fields the catalog-quality chips warn about when products leave them blank. */
export const MISSING_FIELD_CHIPS = ["description", "sku", "price"] as const;

export type MissingProductField = (typeof MISSING_FIELD_CHIPS)[number];
