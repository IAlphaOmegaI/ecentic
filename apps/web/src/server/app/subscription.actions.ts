"use server";

import type { ClientParameters } from "@/server/utils/environment";
import * as Subscription from "./subscription";

export type * from "./subscription";

// Keep internal delegates out of Next.js action registration.
export const createBillingPortalSession = async (
  ...parameters: ClientParameters<
    typeof Subscription.createBillingPortalSession
  >
) => Subscription.createBillingPortalSession(...parameters);

export const createCheckoutSession = async (
  ...parameters: ClientParameters<typeof Subscription.createCheckoutSession>
) => Subscription.createCheckoutSession(...parameters);
