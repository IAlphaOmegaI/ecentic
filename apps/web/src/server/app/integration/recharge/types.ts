import type { schema } from "@/server/database";

export type Offer = typeof schema.rechargeSubscriptionOffer.$inferSelect;
export type Connection = typeof schema.rechargeConnection.$inferSelect;
export type Job = typeof schema.rechargeJob.$inferSelect;
export type Installation = typeof schema.rechargeInstallation.$inferSelect;
export type Metrics = {
  aiFirstOrders: number;
  convertedSubscriptions: number;
  activeSubscriptions: number;
  asOf: Date | null;
};
export type Status = {
  supported: boolean;
  configured: boolean;
  connected: boolean;
  status: Connection["status"] | "not_connected";
  lastSyncedAt: Date | null;
  offerCount: number;
};
export type Lease = {
  store: string;
  generation: number;
  token: string;
  job: Job;
};

export const INSTALL_COOKIE = "ecentic_recharge_install";
export const RESUME_PATH = "/api/integrations/recharge/resume";
export const LEASE_MILLISECONDS = 90_000;

export class RechargeLifecycleError extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = "RechargeLifecycleError";
  }
}

/** Provider error bodies can contain personal data: expose stable codes only. */
export const safeError = (error: unknown) =>
  error instanceof RechargeLifecycleError
    ? error.reason
    : "recharge_unavailable";

export const configuration = () => {
  const clientId = process.env.RECHARGE_CLIENT_ID;
  const clientSecret = process.env.RECHARGE_CLIENT_SECRET;
  const redirectUri = process.env.RECHARGE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri)
    throw new RechargeLifecycleError("not_configured");
  const redirect = new URL(redirectUri);
  // Webhook delivery must reach the app directly even when the registered
  // OAuth callback uses a hostname that redirects to the canonical APP_HOST.
  const origin = new URL(process.env.APP_HOST || redirectUri);
  if (
    (redirect.protocol !== "https:" && redirect.hostname !== "localhost") ||
    (origin.protocol !== "https:" && origin.hostname !== "localhost")
  )
    throw new RechargeLifecycleError("invalid_redirect");
  return { clientId, clientSecret, redirectUri, origin: origin.origin };
};
