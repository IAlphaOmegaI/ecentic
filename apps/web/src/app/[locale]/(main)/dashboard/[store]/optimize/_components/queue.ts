import type { DashboardData } from "@/server/app/optimization";

/** Saved diagnostics are a sample; only pending entries are eligible to publish. */
export const listingQueue = (data: DashboardData) => {
  const pending = new Map(data.pending.map((item) => [item.product.id, item]));
  const dismissed = new Set(data.dismissed.map((item) => item.productId));
  const identifiers = [
    ...new Set([
      ...data.pending.map((item) => item.product.id),
      ...data.diagnostics.insights.map((item) => item.productId),
    ]),
  ];
  return identifiers
    .flatMap((id) => {
      const product = data.products[id];
      if (!product || dismissed.has(id)) return [];
      const insights = data.diagnostics.insights.filter(
        (item) => item.productId === id,
      );
      const candidate = pending.get(id);
      return [
        {
          product,
          image: (() => {
            try {
              const images: unknown = JSON.parse(product.images ?? "[]");
              return Array.isArray(images) && typeof images[0] === "string"
                ? images[0]
                : undefined;
            } catch {
              return undefined;
            }
          })(),
          candidate,
          insights,
          rate: candidate?.winRate ?? insights[0]?.winRate ?? null,
        },
      ];
    })
    .sort(
      (first, second) =>
        (first.rate ?? Number.POSITIVE_INFINITY) -
          (second.rate ?? Number.POSITIVE_INFINITY) ||
        first.product.title.localeCompare(second.product.title) ||
        first.product.id.localeCompare(second.product.id),
    );
};

export const matchesListing = (
  product: { title: string; sku: string | null; id: string },
  query: string,
) =>
  [product.title, product.sku, product.id].some((value) =>
    value?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
