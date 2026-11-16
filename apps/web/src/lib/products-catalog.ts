export const PRODUCT_SORT_FIELDS = [
  "title",
  "price",
  "quality",
  "winRate",
  "updatedAt",
] as const;

export type ProductSort = {
  field: (typeof PRODUCT_SORT_FIELDS)[number];
  direction: "asc" | "desc";
};

/** URL and server-action input share an allowlist; none becomes a SQL name. */
export const normalizeProductSort = (value: unknown): ProductSort => {
  if (typeof value !== "object" || value === null)
    return { field: "updatedAt", direction: "desc" };

  const { field, direction } = value as Record<string, unknown>;
  const selected = PRODUCT_SORT_FIELDS.find((candidate) => candidate === field);
  if (!selected) return { field: "updatedAt", direction: "desc" };

  return {
    field: selected,
    direction: direction === "asc" ? "asc" : "desc",
  };
};
