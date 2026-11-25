import { createHmac, timingSafeEqual } from "node:crypto";
import { assertMerchant } from "./guard";

export const verifySignature = (
  store: string,
  raw: Uint8Array | string,
  signature: string | null,
  secrets: readonly string[],
): boolean => {
  assertMerchant(store);
  if (
    !signature ||
    !/^[A-Za-z0-9+/]{43}=$/.test(signature) ||
    !secrets.length ||
    secrets.length > 2
  )
    return false;
  const expected = Buffer.from(signature, "base64");
  // Evaluate both configured secrets rather than exiting early on a match.
  return secrets
    .map((secret) => {
      if (!secret || secret.length > 4096) return false;
      const digest = createHmac("sha256", secret).update(raw).digest();
      return (
        digest.length === expected.length && timingSafeEqual(digest, expected)
      );
    })
    .includes(true);
};
