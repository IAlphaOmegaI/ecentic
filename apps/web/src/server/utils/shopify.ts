import crypto from "node:crypto";

export const verifyHmac = (query: URLSearchParams, secret: string) => {
  const receivedHmac = query.get("hmac");

  if (!receivedHmac) return false;

  const message = [...query.entries()]
    .filter(([key]) => key !== "hmac")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const generatedHmac = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  const generated = Buffer.from(generatedHmac, "utf8");
  const received = Buffer.from(receivedHmac, "utf8");

  if (generated.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(generated, received);
};

/**
 * Verifies a webhook delivery, whose signature covers the raw request body
 * rather than the sorted query string `verifyHmac` above works over. The body
 * must be the exact bytes Shopify sent — parsing and re-serializing changes the
 * digest, so this has to run before the payload is touched.
 */
export const verifyWebhookHmac = (
  body: string,
  hmac: string,
  secret: string,
) => {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  const generated = Buffer.from(digest, "base64");
  const received = Buffer.from(hmac, "base64");

  // `timingSafeEqual` throws on a length mismatch, which a caller can trigger
  // with a truncated header — compare lengths first so a forged signature is a
  // plain `false` rather than a 500.
  if (generated.length !== received.length) return false;

  return crypto.timingSafeEqual(generated, received);
};

/**
 * Deep link into a store's theme editor with the Agentic structured data app
 * embed pre-activated (`activateAppId={api key}/{block filename}`) — the
 * merchant only has to press Save. Falls back to the plain App embeds panel
 * when the api key is missing.
 */
export const themeEmbedDeepLink = (domain: string) => {
  const host = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const editorUrl = `https://${host}/admin/themes/current/editor?context=apps`;
  const { SHOPIFY_API_KEY } = process.env;

  return SHOPIFY_API_KEY
    ? `${editorUrl}&activateAppId=${SHOPIFY_API_KEY}/structured-data`
    : editorUrl;
};
