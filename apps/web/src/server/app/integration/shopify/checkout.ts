import { randomUUID } from "node:crypto";
import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";
import * as Product from "@/server/app/product";
import * as Store from "@/server/app/store";
import { schema } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import * as HTTP from "@/server/utils/http";
import * as Recharge from "../recharge";
import {
  CHECKOUT_MARKER,
  CHECKOUT_RECEIPT_SECONDS,
  createCheckoutMarker,
} from "./checkout-marker";

export const checkoutInput = z
  .object({
    store: z.string().min(1).max(100),
    variant: z
      .string()
      .regex(/^(?:gid:\/\/shopify\/ProductVariant\/)?[1-9]\d*$/),
    plan: z.string().min(1).max(100).optional(),
    quantity: z.number().int().min(1).max(99).default(1),
  })
  .strict();

const variants = z.object({
  variants: z.array(z.object({ id: z.union([z.string(), z.number()]) })),
});
const responseSchema = z.object({
  data: z
    .object({
      cartCreate: z.object({
        cart: z.object({ id: z.string(), checkoutUrl: z.url() }).nullable(),
        userErrors: z.array(z.object({ message: z.string() })),
      }),
    })
    .optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

/**
 * Internal only: actor comes from the authenticated assistant transport.
 * Creates a cart, not a paid order. Shopify retains payment and consent UI.
 * Tokenless Storefront Cart access needs no additional Shopify write scope.
 */
export const create = async (
  actor: string,
  input: z.infer<typeof checkoutInput>,
) => {
  const store = await Store.get(Environment.SERVER, input.store);
  if (
    !store.success ||
    !store.data ||
    store.data.userId !== actor ||
    store.data.platform !== "shopify" ||
    store.data.status !== "connected"
  )
    return {
      success: false as const,
      error: new Error("Connected Shopify store not found"),
    };

  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret)
    return {
      success: false as const,
      error: new Error("Shopify checkout is not configured"),
    };

  const products = await Product.find(Environment.SERVER, {
    where: eq(schema.product.storeId, input.store),
  });
  if (!products.success) return products;
  const variant = input.variant.replace("gid://shopify/ProductVariant/", "");
  const product = products.data.find((entry) => {
    const raw = resultify((): unknown => JSON.parse(entry.rawData ?? ""));
    if (!raw.success) return false;
    const catalog = variants.safeParse(raw.data);
    return (
      catalog.success &&
      catalog.data.variants.some((entry) => String(entry.id) === variant)
    );
  });
  if (!product)
    return {
      success: false as const,
      error: new Error("Variant is not in this store's synced catalog"),
    };

  const offers = await resultify(() =>
    Recharge.listOffersForProducts({
      store: input.store,
      products: [product.id],
    }),
  );
  if (!offers.success)
    return {
      success: false as const,
      error: new Error("Subscription offers are unavailable"),
    };
  const offer = input.plan
    ? offers.data.find(
        (entry) =>
          entry.planId === input.plan &&
          entry.externalVariantId.replace(
            "gid://shopify/ProductVariant/",
            "",
          ) === variant,
      )
    : null;
  if (input.plan && !offer?.sellingPlanId)
    return {
      success: false as const,
      error: new Error(
        "Subscription plan is unavailable for this variant; sync Recharge again",
      ),
    };
  const sellingPlanId = offer?.sellingPlanId?.replace(
    "gid://shopify/SellingPlan/",
    "",
  );
  if (sellingPlanId && !/^[1-9]\d*$/.test(sellingPlanId))
    return {
      success: false as const,
      error: new Error("Subscription plan has no valid Shopify selling plan"),
    };

  const now = new Date();
  const reference = randomUUID();
  const intent = await resultify(() =>
    Recharge.createCheckoutIntent({
      store: input.store,
      reference,
      expiresAt: new Date(now.getTime() + CHECKOUT_RECEIPT_SECONDS * 1000),
    }),
  );
  if (!intent.success)
    return {
      success: false as const,
      error: new Error("Connect Recharge before starting a tracked checkout"),
    };
  const marker = createCheckoutMarker({
    store: input.store,
    reference,
    secret,
    now,
  });
  const response = await HTTP.request(
    `${store.data.domain.replace(/\/+$/, "")}/api/2026-10/graphql.json`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query:
          "mutation EcenticCheckout($input: CartInput!) { cartCreate(input: $input) { cart { id checkoutUrl } userErrors { message } } }",
        variables: {
          input: {
            attributes: [{ key: CHECKOUT_MARKER, value: marker }],
            lines: [
              {
                merchandiseId: `gid://shopify/ProductVariant/${variant}`,
                quantity: input.quantity,
                ...(sellingPlanId
                  ? {
                      sellingPlanId: `gid://shopify/SellingPlan/${sellingPlanId}`,
                    }
                  : {}),
              },
            ],
          },
        },
      }),
    },
    { guard: true, timeout: 20000 },
  );
  if (!response.success || !response.data.ok)
    return {
      success: false as const,
      error: new Error("Shopify checkout could not be started; retry shortly"),
    };
  const body = await HTTP.parse<unknown>(response);
  if (!body.success)
    return {
      success: false as const,
      error: new Error("Shopify returned an invalid checkout response"),
    };
  const parsed = responseSchema.safeParse(body.data);
  const cart = parsed.success ? parsed.data.data?.cartCreate : null;
  if (
    !parsed.success ||
    parsed.data.errors?.length ||
    !cart?.cart ||
    cart.userErrors.length ||
    !cart.cart.checkoutUrl.startsWith("https://")
  )
    return {
      success: false as const,
      error: new Error(
        "Shopify could not create this cart. Check variant availability and the subscription plan.",
      ),
    };
  return {
    success: true as const,
    data: {
      checkoutUrl: cart.cart.checkoutUrl,
      reference,
      status: "awaiting-buyer-payment",
      message:
        "Checkout started by an AI assistant. The buyer must review and complete payment on Shopify.",
    },
  };
};
