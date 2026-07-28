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
