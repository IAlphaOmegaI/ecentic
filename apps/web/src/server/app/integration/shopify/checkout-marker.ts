import { createHmac, timingSafeEqual } from "node:crypto";

export const CHECKOUT_MARKER = "_ecentic_ai_checkout";
export const CHECKOUT_RECEIPT_SECONDS = 7 * 24 * 60 * 60;
const REFERENCE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const digest = (store: string, reference: string, issued: string, secret: string) =>
  createHmac("sha256", secret)
    .update(JSON.stringify(["ecentic.ai-checkout.v1", store, reference, issued]))
    .digest("hex");

/** A receipt identifies a checkout initiated by ecentic, never an AI referral. */
export const createCheckoutMarker = ({
  store,
  reference,
  secret,
  now = new Date(),
}: { store: string; reference: string; secret: string; now?: Date }) => {
  if (!secret || !REFERENCE.test(reference) || !Number.isFinite(now.getTime()))
    throw new Error("Checkout receipt configuration is invalid");
  const issued = String(Math.floor(now.getTime() / 1000));
  return `v1:${reference}:${issued}:${digest(store, reference, issued, secret)}`;
};

/** Validate at the signed Shopify order's creation time, allowing delayed delivery. */
export const verifyCheckoutMarker = ({
  marker,
  store,
  secret,
  at,
}: { marker: string; store: string; secret: string; at: Date }) => {
  if (!secret || marker.length > 200 || !Number.isFinite(at.getTime())) return null;
  const [version, reference, issued, signature, extra] = marker.split(":");
  if (
    version !== "v1" || !reference || !REFERENCE.test(reference) ||
    !issued || !/^\d{10}$/.test(issued) || !signature ||
    !/^[a-f0-9]{64}$/.test(signature) || extra !== undefined
  ) return null;
  const age = at.getTime() / 1000 - Number(issued);
  if (age < -300 || age > CHECKOUT_RECEIPT_SECONDS) return null;
  const expected = Buffer.from(digest(store, reference, issued, secret), "hex");
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) return null;
  return { reference, issuedAt: new Date(Number(issued) * 1000) };
};
