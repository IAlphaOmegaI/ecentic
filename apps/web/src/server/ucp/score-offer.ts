import type { UcpProductOffer } from "./schema";

export type UcpOfferAuditResult = {
  score: number;
  gaps: string[];
};

const checks: {
  id: string;
  pass: (offer: UcpProductOffer) => boolean;
}[] = [
  {
    id: "product.name",
    pass: (o) => o.name.trim().length > 0,
  },
  {
    id: "product.offers.price",
    pass: (o) =>
      Boolean(o.offers.price && o.offers.price !== "0" && o.offers.price !== "0.00"),
  },
  {
    id: "product.offers.priceCurrency",
    pass: (o) => Boolean(o.offers.priceCurrency?.trim()),
  },
  {
    id: "product.offers.availability",
    pass: (o) => Boolean(o.offers.availability?.trim()),
  },
  {
    id: "product.description",
    pass: (o) => Boolean(o.description && o.description.trim().length > 20),
  },
  {
    id: "product.sku",
    pass: (o) => Boolean(o.sku && o.sku.trim().length > 0),
  },
  {
    id: "product.url",
    pass: (o) => Boolean(o.url && o.url.trim().startsWith("http")),
  },
];

/**
 * Deterministic UCP readiness score from structured offer data (no LLM).
 */
export const scoreUcpProductOffer = (
  offer: UcpProductOffer,
): UcpOfferAuditResult => {
  const gaps: string[] = [];

  for (const check of checks) {
    if (!check.pass(offer)) gaps.push(check.id);
  }

  const score =
    checks.length === 0
      ? 0
      : Math.round(((checks.length - gaps.length) / checks.length) * 100);

  return { score, gaps };
};
