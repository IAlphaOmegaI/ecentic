import { createHmac, timingSafeEqual } from "node:crypto";

export const sign = (payload: string, secret: string) => {
  const digest = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${digest}`;
};

export const verify = (token: string, secret: string) => {
  const [encoded, digest] = token.split(".");
  if (encoded === undefined || !digest) return null;
  const payload = Buffer.from(encoded, "base64url").toString();
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  if (expected.length !== digest.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(digest))) return null;
  return payload;
};
