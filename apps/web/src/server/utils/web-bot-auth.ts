/**
 * Site identity for Web Bot Auth (HTTP Message Signatures Directory).
 * Public JWK is published at `/.well-known/http-message-signatures-directory`.
 * Private key lives in `WEB_BOT_AUTH_PRIVATE_JWK` (never commit it).
 *
 * @see https://datatracker.ietf.org/wg/webbotauth/about/
 * @see https://developers.cloudflare.com/bots/reference/bot-verification/web-bot-auth/
 */

export type Ed25519PublicJwk = {
  kty: "OKP";
  crv: "Ed25519";
  x: string;
  kid: string;
  nbf?: number;
};

/** Published identity key — kid is the RFC 7638 JWK thumbprint. */
export const webBotAuthPublicJwk = {
  kty: "OKP",
  crv: "Ed25519",
  x: "FVmdUNEY2xYGoEf5pQaC84Ojf4fQAXUx_V6yUbbTihk",
  kid: "ya8-ExXSJJcd3vHXeTIz2_5deZEgjtIDlAW5g4BIfrs",
  // Key valid from first publish (unix ms) — 2026-07-29.
  nbf: 1_785_283_200_000,
} as const satisfies Ed25519PublicJwk;
