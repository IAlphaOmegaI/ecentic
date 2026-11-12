"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { z } from "zod";
import { withContext } from "../utils/context";
import { deliverMarketingLead, leadEmailText } from "../utils/marketing-lead";
import { consume } from "../utils/rate-limit";

/** The secret envelope keeps visitor contact details out of action-argument telemetry. */
export const submit = withContext(
  async (_context, { contactSecret }: { contactSecret: unknown }) => {
    const outcome = await deliverMarketingLead(contactSecret, {
      permission: async () => {
        const verdict = await consume(
          { headers: await headers() },
          { name: "marketing-lead", limit: 3, window: 600, keyed: false },
        );
        // An email endpoint must not become unmetered during a Redis outage.
        if (verdict.remaining === null) return "unavailable";
        return verdict.allowed ? "allowed" : "limited";
      },
      send: async (lead, idempotencyKey) => {
        const recipient = z
          .email()
          .safeParse(
            process.env.MARKETING_LEAD_EMAIL ?? "enterprise@ecentic.ai",
          );
        if (
          !process.env.RESEND_API_KEY ||
          !process.env.FROM_EMAIL ||
          !recipient.success
        )
          return false;
        const resend = new Resend(process.env.RESEND_API_KEY);
        const delivered = await resend.emails.send(
          {
            from: process.env.FROM_EMAIL,
            to: recipient.data,
            replyTo: lead.email,
            subject: `ecentic ${lead.kind} enquiry`,
            text: leadEmailText(lead),
          },
          { idempotencyKey },
        );
        return !delivered.error && !!delivered.data?.id;
      },
    });
    return { success: true as const, data: { outcome } };
  },
  "MarketingLead.submit",
);
