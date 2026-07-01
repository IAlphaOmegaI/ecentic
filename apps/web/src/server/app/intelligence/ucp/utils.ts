import * as z from "zod";
import {
  checkoutPaymentSchema,
  createCheckoutWithFulfillmentRequestSchema,
  updateCheckoutWithFulfillmentRequestSchema,
} from "./advanced-validator";

// Shared UCP checkout argument shapes for the MCP transport, consumed by both the
// playground and the flow-tester. MCP §3A — checkout arguments: session id at top
// level; body nested under checkout.

export const checkoutCurrencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "currency must be a 3-letter ISO 4217 code")
  .describe("ISO 4217 currency code (e.g., USD).");

export const checkoutMcpPayloadSchema =
  createCheckoutWithFulfillmentRequestSchema.extend({
    currency: checkoutCurrencySchema.optional(),
  });

export const checkoutMcpUpdatePayloadSchema =
  updateCheckoutWithFulfillmentRequestSchema.omit({ id: true }).extend({
    currency: checkoutCurrencySchema.optional(),
  });

export const createCheckoutMcpInputSchema = z
  .object({
    cart_id: z
      .string()
      .optional()
      .describe(
        "Cart ID to convert to checkout. Business MUST use cart contents (line_items, context, buyer) and MUST ignore overlapping fields in checkout payload.",
      ),
    checkout: checkoutMcpPayloadSchema
      .optional()
      .describe(
        "Checkout body under arguments.checkout. Use alone for from-scratch create — omit cart_id.",
      ),
  })
  .superRefine((input, context) => {
    if (!input.cart_id && !input.checkout) {
      context.addIssue({
        code: "custom",
        message: "Provide cart_id or checkout",
      });
    }
    if (input.cart_id && input.checkout) {
      context.addIssue({
        code: "custom",
        message: "Use cart_id alone OR checkout alone, not both",
      });
    }
  });

export const updateCheckoutMcpInputSchema = z.object({
  id: z.string().describe("Checkout session ID at arguments top level."),
  checkout: checkoutMcpUpdatePayloadSchema.describe(
    "Full replacement checkout body under arguments.checkout. Must not contain a session id.",
  ),
});

export const completeCheckoutMcpInputSchema = z.object({
  id: z.string().describe("Checkout session ID at arguments top level."),
  checkout: z
    .object({
      payment: checkoutPaymentSchema.describe(
        "Payment instruments nested under arguments.checkout.payment.",
      ),
    })
    .describe("Finalization payload under arguments.checkout."),
});
