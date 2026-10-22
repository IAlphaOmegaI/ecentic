"use server";

import { resultify } from "@zenncore/utils";
import { UserRole } from "@/server/database/validators";
import { withAuthorization } from "../../utils/authorization";
import { loadDemoProduct } from "./claim-check-demo-source";
import { runClaimCheck } from "./claim-check-engine";

/**
 * The live claim-check demo behind `/dev/claim-check`: reads any public
 * Shopify or WooCommerce product page and runs the real check on it, without a
 * store connection and without storing anything.
 *
 * Gated on ecentic staff at the action, not only the route: `proxy.ts` guards
 * page requests, but a server action is reachable by POST from anywhere its
 * module is bundled — and every run spends real model calls.
 */
export const runDemoClaimCheck = withAuthorization(
  [UserRole.STAFF],
  async (_context, { url }: { url: string }) => {
    const source = await loadDemoProduct(url);
    if (!source.success) return source;

    const report = await resultify(() =>
      runClaimCheck({
        product: source.data.product,
        store: source.data.store,
        startedAt: new Date(),
      }),
    );
    if (!report.success) return report;

    return {
      success: true as const,
      data: { platform: source.data.platform, report: report.data },
    };
  },
  "ClaimCheck.runDemo",
);
