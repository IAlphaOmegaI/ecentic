// Loop data is read per merchant, after consent, and never combined across merchants.
import type { LoopAuth } from "@ecentic/loop";
import type { schema } from "@/server/database";

export type Connection = typeof schema.loopConnection.$inferSelect;
export type Job = typeof schema.loopJob.$inferSelect;
export type Lease = {
  store: string;
  generation: number;
  token: string;
  job: Job;
};
export type Status = {
  supported: boolean;
  configured: boolean;
  connected: boolean;
  status: Connection["status"] | "not_connected";
  lastSyncedAt: Date | null;
  lastError: string | null;
  cleanupRequired: boolean;
  oauthEnabled: boolean;
  returnCount: number;
};
export type LoopStatus = Status;
export const INSTALL_COOKIE = "ecentic_loop_install";
export const LEASE_MILLISECONDS = 660_000;
export class LoopLifecycleError extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = "LoopLifecycleError";
  }
}
export const safeError = (error: unknown) =>
  error instanceof LoopLifecycleError ? error.reason : "loop_unavailable";
export const webhookOrigin = () => {
  const value = process.env.APP_HOST;
  if (!value) throw new LoopLifecycleError("not_configured");
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost")
    throw new LoopLifecycleError("invalid_origin");
  return url.origin;
};
export const oauthConfiguration = () => {
  if (process.env["LOOP_OAUTH_ENABLED"] !== "1")
    throw new LoopLifecycleError("oauth_disabled");
  const clientId = process.env["LOOP_CLIENT_ID"];
  const clientSecret = process.env["LOOP_CLIENT_SECRET"];
  const redirectUri = process.env["LOOP_REDIRECT_URI"];
  // TODO(loop-confirm): no documented OAuth scope grants reading returns. Never guess.
  const scopes = process.env["LOOP_OAUTH_SCOPES"]?.split(/\s+/).filter(Boolean);
  if (
    !clientId ||
    !clientSecret ||
    !redirectUri ||
    !scopes?.length ||
    !scopes.includes("offline_access")
  )
    throw new LoopLifecycleError("oauth_scopes_unconfirmed");
  const redirect = new URL(redirectUri);
  if (redirect.protocol !== "https:" && redirect.hostname !== "localhost")
    throw new LoopLifecycleError("invalid_origin");
  return { clientId, clientSecret, redirectUri, scopes };
};
export const connectionAuth = (connection: Connection): LoopAuth => {
  if (connection.authMode === "api_key" && connection.apiKey)
    return { mode: "api_key", apiKey: connection.apiKey };
  if (
    connection.authMode === "oauth" &&
    connection.accessToken &&
    connection.refreshToken &&
    connection.accessTokenExpiresAt
  )
    return {
      mode: "oauth",
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      expiresAt: connection.accessTokenExpiresAt.getTime(),
    };
  throw new LoopLifecycleError("reconnect_required");
};
