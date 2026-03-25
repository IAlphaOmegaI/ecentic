"use server";

import { eq } from "drizzle-orm";
import { schema } from "@/server/database";
import { UCP_SPEC_VERSION } from "@/server/ucp/constants";
import { mapProductRowToUcpOffer } from "@/server/ucp/map-from-product";
import { scoreUcpProductOffer } from "@/server/ucp/score-offer";
import { ucpProductOfferSchema } from "@/server/ucp/schema";
import { withAuthentication } from "@/server/utils/authentication";
import { Environment } from "@/server/utils/environment";
import { repository } from "@/server/utils/repository";
import * as Product from "../product";

const audits = repository(schema.ucpAudit);

const resolveOffer = (row: Product.Type) => {
  if (row.ucpOfferJson) {
    const fromDb = ucpProductOfferSchema.safeParse(row.ucpOfferJson);
    if (fromDb.success) return fromDb.data;
  }
  const draft = mapProductRowToUcpOffer(row);
  const parsed = ucpProductOfferSchema.safeParse(draft);
  return parsed.success ? parsed.data : null;
};

/**
 * Runs a deterministic UCP readiness pass for every catalog product and records results in `ucp_audit`.
 */
export const runComplianceAudit = withAuthentication(async (context) => {
  const products = await Product.find(Environment.SERVER, {
    where: eq(schema.product.userId, context.session.user.id),
  });

  if (!products.success) return products;

  let audited = 0;

  for (const row of products.data) {
    const offer = resolveOffer(row);
    if (!offer) continue;

    const { score, gaps } = scoreUcpProductOffer(offer);

    const created = await audits.create(Environment.SERVER, {
      userId: context.session.user.id,
      productId: row.id,
      score,
      gaps,
      specVersion: UCP_SPEC_VERSION,
    });

    if (created.success) audited += 1;
  }

  return {
    success: true as const,
    data: { audited, totalProducts: products.data.length },
  };
}, "UcpAudit.runComplianceAudit");
