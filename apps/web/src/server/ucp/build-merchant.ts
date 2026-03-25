import type { product, ucpProfile } from "@/server/database/schema";
import { UCP_SPEC_VERSION } from "./constants";
import { mapProductRowToUcpOffer } from "./map-from-product";
import type { UcpMerchantDocument } from "./schema";
import { ucpMerchantDocumentSchema, ucpProductOfferSchema } from "./schema";

type ProductRow = typeof product.$inferSelect;
type UcpProfileRow = typeof ucpProfile.$inferSelect;

const splitPaymentMethods = (raw: string | null | undefined): string[] | undefined => {
  if (!raw?.trim()) return undefined;
  const parts = raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
};

const splitCertifications = (raw: string | null | undefined): string[] | undefined => {
  if (!raw?.trim()) return undefined;
  const parts = raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
};

const MAX_EMBEDDED_OFFERS = 80;

type BuildParams = {
  profile: UcpProfileRow | null | undefined;
  products: ProductRow[];
};

/**
 * Assembles a merchant-level UCP document from profile fields + catalog rows.
 */
export const buildMerchantDocument = ({
  profile,
  products,
}: BuildParams): UcpMerchantDocument => {
  const name =
    profile?.merchantName?.trim() ||
    (products[0]?.title ? `Merchant — ${products[0].title}` : "Merchant");

  const offers: ReturnType<typeof mapProductRowToUcpOffer>[] = [];
  for (const row of products.slice(0, MAX_EMBEDDED_OFFERS)) {
    const draft = mapProductRowToUcpOffer(row);
    const parsed = ucpProductOfferSchema.safeParse(draft);
    if (parsed.success) offers.push(parsed.data);
  }

  const draft: UcpMerchantDocument = {
    "@context": "https://schema.org",
    "@type": "Merchant",
    ucpSpecVersion: UCP_SPEC_VERSION,
    name,
    description: profile?.description ?? undefined,
    logo: profile?.logoUrl ?? undefined,
    paymentMethods: splitPaymentMethods(profile?.paymentMethods ?? undefined),
    shippingPolicy: profile?.shippingPolicy ?? undefined,
    returnPolicy: profile?.returnPolicy ?? undefined,
    contact: profile?.contactEmail
      ? { email: profile.contactEmail }
      : undefined,
    sustainability: profile?.sustainability ?? undefined,
    certifications: splitCertifications(profile?.certifications ?? undefined),
    catalog: {
      totalProducts: products.length,
      offers: offers.length > 0 ? offers : undefined,
    },
  };

  const parsed = ucpMerchantDocumentSchema.safeParse(draft);
  if (!parsed.success) {
    throw new Error(
      `UCP merchant document validation failed: ${parsed.error.message}`,
    );
  }

  return parsed.data;
};
