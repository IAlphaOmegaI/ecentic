import { createHash } from "node:crypto";
import { resultify } from "@zenncore/utils";
import {
  type MarketingLeadInput,
  marketingLeadSchema,
} from "@/lib/marketing-lead";

export type LeadOutcome = "sent" | "invalid" | "limited" | "unavailable";
type Dependencies = {
  permission: () => Promise<"allowed" | "limited" | "unavailable">;
  send: (lead: MarketingLeadInput, idempotencyKey: string) => Promise<boolean>;
};

export const leadIdempotencyKey = (lead: MarketingLeadInput) =>
  `marketing-lead/${createHash("sha256").update(JSON.stringify(lead)).digest("hex")}`;

export const leadEmailText = (lead: MarketingLeadInput) =>
  Object.entries(lead)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n\n");

/** Validation and delivery can be checked with an in-memory sender, without sending email. */
export const deliverMarketingLead = async (
  input: unknown,
  dependencies: Dependencies,
): Promise<LeadOutcome> => {
  const parsed = marketingLeadSchema.safeParse(input);
  if (!parsed.success) return "invalid";
  const permission = await resultify(dependencies.permission);
  if (!permission.success) return "unavailable";
  if (permission.data !== "allowed") return permission.data;
  const delivered = await resultify(() =>
    dependencies.send(parsed.data, leadIdempotencyKey(parsed.data)),
  );
  return delivered.success && delivered.data ? "sent" : "unavailable";
};
