/** Invented checkout example. No store calls, orders, or payment requests are made. */
export const checkoutSteps = [
  { id: "find", before: "complete", after: "complete" },
  { id: "availability", before: "complete", after: "complete" },
  { id: "cart", before: "complete", after: "complete" },
  { id: "shipping", before: "complete", after: "complete" },
  { id: "contact", before: "stopped", after: "complete" },
  { id: "payment", before: "pending", after: "complete" },
  { id: "order", before: "pending", after: "complete" },
] as const;

export type CheckoutState = "before" | "after";
