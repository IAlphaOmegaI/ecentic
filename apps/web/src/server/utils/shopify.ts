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
