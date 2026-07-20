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

// create_checkout takes EITHER a cart_id (convert an existing cart) OR a full
// checkout body (from scratch). Models routinely emit both — a cart_id plus a
// stray empty `checkout: {}` — and a strict XOR / required-line_items schema
// rejects that at the AI-SDK input layer *before* execute runs, so the model
// just retries blindly and no tool call ever lands.
//
// Keep the top level a single object (Gemini function-calling needs an object
// root, not a union/anyOf) and make `checkout` PARTIAL so an empty/partial body
// alongside cart_id is accepted. The either/or is enforced softly in the refine
// (only the from-scratch path needs line_items), and `normalizeCreateCheckoutArgs`
// drops the ignored half before the call.
export const createCheckoutMcpInputSchema = z
  .object({
    cart_id: z
      .string()
      .optional()
      .describe(
        "Cart ID to convert to checkout. When set, the business uses the cart's line_items/context/buyer and any checkout body is ignored — prefer this to convert an existing cart.",
      ),
    checkout: checkoutMcpPayloadSchema
      .partial()
      .optional()
      .describe(
        "Checkout body under arguments.checkout. Provide for from-scratch create (with a non-empty line_items); omit when passing cart_id.",
      ),
  })
  .superRefine((input, context) => {
    if (!input.cart_id && !input.checkout) {
      context.addIssue({
        code: "custom",
        message: "Provide cart_id or checkout",
      });
      return;
    }

    // Only the from-scratch path needs a real checkout body. When a cart_id is
    // present the checkout is ignored, so don't reject a stray/empty one.
    if (!input.cart_id) {
      const lineItems = input.checkout?.line_items;

      if (!lineItems || lineItems.length === 0) {
        context.addIssue({
          code: "custom",
          path: ["checkout", "line_items"],
          message:
            "Provide at least one line item, or pass cart_id to convert an existing cart",
        });
      }
    }
  });

// Collapse a create_checkout input to the single half the store should receive:
// { cart_id } when converting a cart, otherwise { checkout }. Drops the stray
// checkout a model often tacks on alongside cart_id. The refine guarantees a
// usable checkout on the from-scratch path.
export const normalizeCreateCheckoutArgs = (
  input: z.infer<typeof createCheckoutMcpInputSchema>,
): { cart_id: string } | { checkout: unknown } =>
  input.cart_id ? { cart_id: input.cart_id } : { checkout: input.checkout };

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
