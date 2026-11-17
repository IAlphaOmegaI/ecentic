import { identifier } from "./http";

export type RechargeProduct = {
  external_product_id?: string | number;
  variants?: {
    external_variant_id?: string | number;
    prices?: { unit_price?: string | number | null };
  }[];
};

export type RechargePlan = {
  id?: string | number;
  type?: string;
  deleted_at?: string | null;
  external_product_id?: { ecommerce?: string | number | null };
  external_plan_id?: string | number | null;
  external_variant_ids?: (string | number)[];
  has_variant_restrictions?: boolean;
  discount_type?: string | null;
  discount_amount?: string | number | null;
  subscription_preferences?: {
    order_interval_unit?: string | null;
    order_interval_frequency?: number | string | null;
    charge_interval_frequency?: number | string | null;
  } | null;
};

export type CatalogVariant = {
  externalProductId: string;
  externalVariantId: string;
  price: string;
  currency: string;
};

export type NormalizedOffer = {
  externalProductId: string;
  externalVariantId: string;
  planId: string;
  sellingPlanId: string | null;
  planType: string;
  discountType: "percentage" | "fixed_amount" | null;
  discountAmount: string | null;
  price: string | null;
  currency: string | null;
  orderIntervalUnit: "day" | "week" | "month" | null;
  orderIntervalFrequency: number | null;
  chargeIntervalFrequency: number | null;
  pricingStatus: "available" | "unavailable";
  unavailableReason: string | null;
};

const decimal = (value: unknown) => {
  const text =
    typeof value === "number" && Number.isFinite(value) ? String(value) : value;
  if (
    typeof text !== "string" ||
    text.length > 32 ||
    !/^\d+(\.\d{1,8})?$/.test(text)
  )
    return null;
  const [whole = "0", fraction = ""] = text.split(".");
  return {
    numerator: BigInt(whole + fraction),
    denominator: 10n ** BigInt(fraction.length),
    text,
  };
};

const positiveInteger = (value: unknown) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
};

const currencyCode = (value: unknown) =>
  typeof value === "string" && /^[A-Z]{3}$/.test(value) ? value : null;

/** Exact decimal arithmetic; amounts are rounded once at the currency boundary. */
export const discountedPrice = ({
  price,
  currency,
  discountType,
  discountAmount,
}: {
  price: string;
  currency: string;
  discountType: "percentage" | "fixed_amount" | null;
  discountAmount: string | null;
}): string | null => {
  const base = decimal(price);
  const discount = decimal(discountAmount ?? "0");
  if (!base || !discount || !currencyCode(currency)) return null;
  if (!discountType && discount.numerator !== 0n) return null;
  if (
    discountType === "percentage" &&
    discount.numerator > 100n * discount.denominator
  )
    return null;
  const digits =
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  const scale = 10n ** BigInt(digits);
  const amount = (() => {
    if (discountType === "percentage")
      return {
        numerator:
          base.numerator * (100n * discount.denominator - discount.numerator),
        denominator: base.denominator * 100n * discount.denominator,
      };
    if (discountType === "fixed_amount")
      return {
        numerator:
          base.numerator * discount.denominator -
          discount.numerator * base.denominator,
        denominator: base.denominator * discount.denominator,
      };
    return base;
  })();
  const positive = amount.numerator > 0n ? amount.numerator : 0n;
  const rounded =
    (positive * scale * 2n + amount.denominator) / (2n * amount.denominator);
  return digits === 0
    ? String(rounded)
    : `${rounded / scale}.${String(rounded % scale).padStart(digits, "0")}`;
};

export const normalizeSubscriptionOffers = ({
  products,
  plans,
  catalog = [],
  currency,
}: {
  products: RechargeProduct[];
  plans: RechargePlan[];
  catalog?: CatalogVariant[];
  currency?: string;
}): NormalizedOffer[] => {
  const variants = new Map<string, CatalogVariant>();
  for (const product of products) {
    const externalProductId = identifier(product.external_product_id);
    if (!externalProductId) continue;
    for (const variant of product.variants ?? []) {
      const externalVariantId = identifier(variant.external_variant_id);
      if (!externalVariantId) continue;
      variants.set(`${externalProductId}:${externalVariantId}`, {
        externalProductId,
        externalVariantId,
        price: decimal(variant.prices?.unit_price)?.text ?? "",
        currency: currencyCode(currency) ?? "",
      });
    }
  }
  for (const variant of catalog)
    variants.set(
      `${variant.externalProductId}:${variant.externalVariantId}`,
      variant,
    );

  const offers = plans.flatMap((plan): NormalizedOffer[] => {
    const externalProductId = identifier(plan.external_product_id?.ecommerce);
    const planId = identifier(plan.id);
    if (
      !externalProductId ||
      !planId ||
      plan.deleted_at ||
      !plan.type ||
      plan.type === "onetime"
    )
      return [];
    const restricted = new Set(
      (plan.external_variant_ids ?? []).flatMap((id) => {
        const value = identifier(id);
        return value ? [value] : [];
      }),
    );
    const preferences = plan.subscription_preferences;
    const orderIntervalUnit =
      preferences?.order_interval_unit === "day" ||
      preferences?.order_interval_unit === "week" ||
      preferences?.order_interval_unit === "month"
        ? preferences.order_interval_unit
        : null;
    const orderIntervalFrequency = positiveInteger(
      preferences?.order_interval_frequency,
    );
    const chargeIntervalFrequency = positiveInteger(
      preferences?.charge_interval_frequency,
    );
    const discountType =
      plan.discount_type === "percentage" ||
      plan.discount_type === "fixed_amount"
        ? plan.discount_type
        : null;
    const discountAmount = decimal(plan.discount_amount)?.text ?? null;
    return [...variants.values()]
      .filter(
        (variant) =>
          variant.externalProductId === externalProductId &&
          (!plan.has_variant_restrictions ||
            restricted.has(variant.externalVariantId)),
      )
      .map((variant): NormalizedOffer => {
        const normalizedCurrency = currencyCode(variant.currency);
        const unavailableReason = (() => {
          // TODO(recharge-confirm): prepaid billing-price semantics and authoritative
          // Shopify selling-plan allocations. Retain intervals; never invent a price.
          if (plan.type !== "subscription") return "unsupported-plan-pricing";
          if (
            !orderIntervalUnit ||
            !orderIntervalFrequency ||
            !chargeIntervalFrequency
          )
            return "missing-delivery-interval";
          if (orderIntervalFrequency !== chargeIntervalFrequency)
            return "prepaid-price-needs-confirmation";
          if (plan.discount_type && !discountType)
            return "unsupported-discount";
          if (discountType && discountAmount === null)
            return "missing-discount-amount";
          if (
            plan.discount_amount !== null &&
            plan.discount_amount !== undefined &&
            !discountAmount
          )
            return "invalid-discount";
          if (!normalizedCurrency || !decimal(variant.price))
            return "missing-variant-price";
          return null;
        })();
        const price =
          !unavailableReason && normalizedCurrency
            ? discountedPrice({
                price: variant.price,
                currency: normalizedCurrency,
                discountType,
                discountAmount,
              })
            : null;
        return {
          externalProductId,
          externalVariantId: variant.externalVariantId,
          planId,
          sellingPlanId: identifier(plan.external_plan_id),
          planType: plan.type ?? "unknown",
          discountType,
          discountAmount,
          price,
          currency: normalizedCurrency,
          orderIntervalUnit,
          orderIntervalFrequency,
          chargeIntervalFrequency,
          pricingStatus: price === null ? "unavailable" : "available",
          unavailableReason:
            unavailableReason ??
            (price === null ? "invalid-price-or-discount" : null),
        };
      });
  });
  // Repeated pages/retried imports must not duplicate a plan+variant offer.
  return [
    ...new Map(
      offers.map((offer) => [
        `${offer.externalProductId}:${offer.externalVariantId}:${offer.planId}`,
        offer,
      ]),
    ).values(),
  ];
};
