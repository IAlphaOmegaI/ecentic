"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useToastManager } from "@zenncore/web/components/toast";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { z } from "zod";
import * as GoogleMerchant from "@/server/app/integration/google-merchant";
import { Chip } from "./google-shopping-client";

/**
 * Per-product agentic-checkout (UCP) settings. Toggling a product eligible or
 * saving a consumer notice only records the choice — it reaches Google on the
 * next "Push optimizations" run, riding the same supplemental feed as the
 * listing overrides. Restricted-category hints are heuristics over the
 * product's own text: they warn, the merchant decides.
 */

const NOTICE_TYPES = [
  "none",
  "legal_disclaimer",
  "safety_warning",
  "prop_65",
] as const;

const NOTICE_LABELS: Record<string, string> = {
  ucp_subscription: "subscription",
  ucp_preorder: "pre-order",
  ucp_personalized: "personalized",
  ucp_not_new_or_final_sale: "not new / final sale",
  ucp_gifting: "gift card",
  ucp_age_restricted: "age-restricted",
  ucp_rental: "rental",
  ucp_bundled_service: "bundled service",
};

const ProductEditor = ({
  store,
  product,
  onSaved,
}: {
  store: string;
  product: GoogleMerchant.UcpProduct;
  onSaved: () => void;
}) => {
  const toast = useToastManager();

  const [handleSubmit, isSaving] = useAsyncAction(
    async (data: {
      noticeType: (typeof NOTICE_TYPES)[number];
      noticeMessage: string;
      merchantItemId: string;
    }) => {
      const result = await GoogleMerchant.setUcpProduct({
        store,
        product: product.id,
        checkoutEligible: product.ucp?.checkoutEligible ?? false,
        noticeType: data.noticeType === "none" ? null : data.noticeType,
        noticeMessage: data.noticeMessage || null,
        merchantItemId: data.merchantItemId || null,
      });

      if (!result.success) {
        toast.add({
          title: "Checkout settings",
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({ title: "Checkout settings saved", type: "success" });
      onSaved();
    },
  );

  const config = useMemo(
    () =>
      ({
        noticeType: field({
          shape: "select",
          validator: z.enum(NOTICE_TYPES),
          label: "Consumer notice",
        }),
        noticeMessage: field({
          shape: "text",
          validator: z
            .string()
            .max(1000, "Notice messages are capped at 1000 characters"),
          label: "Notice message",
          placeholder: "e.g. This product can expose you to chemicals…",
          classList: { field: "flex-1" },
        }),
        merchantItemId: field({
          shape: "text",
          validator: z.string(),
          label: "Checkout item ID (optional)",
          placeholder: "Only if it differs from the feed ID",
        }),
      }) satisfies GenericForm,
    [],
  );

  return (
    <InferredForm
      config={config}
      defaultValues={{
        noticeType: product.ucp?.noticeType ?? "none",
        noticeMessage: product.ucp?.noticeMessage ?? "",
        merchantItemId: product.ucp?.merchantItemId ?? "",
      }}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 border-accent-foreground border-t pt-3 sm:flex-row sm:items-end"
    >
      <Button
        type="submit"
        color="neutral"
        className="shrink-0"
        disabled={isSaving}
      >
        {isSaving ? "Saving…" : "Save"}
      </Button>
    </InferredForm>
  );
};

/** Collapsed-by-default wrapper so the readiness list stays scannable — the
 * form only takes over the row once the merchant asks for it. */
const Disclosure = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      <div>
        <Button color="neutral" onClick={() => setOpen((current) => !current)}>
          {open ? "Hide" : label}
        </Button>
      </div>
      {open && children}
    </div>
  );
};

/**
 * Writes the customer-service contact straight to Merchant Center. The PATCH
 * replaces the whole contact object, so the form always submits every field —
 * clearing one in the form clears it on Google too.
 */
export const CustomerSupportEditor = ({
  store,
  current,
}: {
  store: string;
  current: { email: string | null; uri: string | null; phone: string | null };
}) => {
  const toast = useToastManager();
  const router = useRouter();

  const [handleSubmit, isSaving] = useAsyncAction(
    async (data: { website: string; email: string; phone: string }) => {
      const result = await GoogleMerchant.setCustomerSupport({
        store,
        uri: data.website || null,
        email: data.email || null,
        phone: data.phone || null,
      });

      if (!result.success) {
        toast.add({
          title: "Customer support",
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({
        title: "Customer support contact saved to Merchant Center",
        type: "success",
      });
      router.refresh();
    },
  );

  const config = useMemo(
    () =>
      ({
        website: field({
          shape: "text",
          validator: z.string(),
          label: "Support website",
          placeholder: "https://your-store.com/contact",
          classList: { field: "flex-1" },
        }),
        email: field({
          shape: "text",
          validator: z.string(),
          label: "Support email",
          placeholder: "support@your-store.com",
        }),
        phone: field({
          shape: "text",
          validator: z.string(),
          label: "Support phone",
          placeholder: "+15551234567",
        }),
      }) satisfies GenericForm,
    [],
  );

  const configured = Boolean(current.email || current.uri || current.phone);

  return (
    <Disclosure label={configured ? "Update contact" : "Set contact"}>
      <InferredForm
        config={config}
        defaultValues={{
          website: current.uri ?? "",
          email: current.email ?? "",
          phone: current.phone ?? "",
        }}
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <Button
          type="submit"
          color="neutral"
          className="shrink-0"
          disabled={isSaving}
        >
          {isSaving ? "Saving…" : "Save to Merchant Center"}
        </Button>
      </InferredForm>
    </Disclosure>
  );
};

const RETURN_WINDOWS = [
  "14 days",
  "30 days",
  "60 days",
  "90 days",
  "Lifetime",
] as const;

const RETURN_METHODS = ["By mail", "In store", "At a kiosk"] as const;
const RETURN_METHOD_VALUES: Record<
  (typeof RETURN_METHODS)[number],
  "BY_MAIL" | "IN_STORE" | "AT_A_KIOSK"
> = {
  "By mail": "BY_MAIL",
  "In store": "IN_STORE",
  "At a kiosk": "AT_A_KIOSK",
};
const RETURN_METHOD_LABELS: Record<string, (typeof RETURN_METHODS)[number]> = {
  BY_MAIL: "By mail",
  IN_STORE: "In store",
  AT_A_KIOSK: "At a kiosk",
};

const ITEM_CONDITIONS = ["New", "Used"] as const;
const ITEM_CONDITION_VALUES: Record<
  (typeof ITEM_CONDITIONS)[number],
  "NEW" | "USED"
> = { New: "NEW", Used: "USED" };
const ITEM_CONDITION_LABELS: Record<string, (typeof ITEM_CONDITIONS)[number]> =
  { NEW: "New", USED: "Used" };

const RETURN_SHIPPING = [
  "Free return shipping",
  "Customer pays return shipping",
] as const;

/**
 * Creates or replaces the account's default return policy from ecentic. The
 * Merchant API has no update for return policies, so when one exists the form
 * prefills from it and submits with `replace` — an explicit delete-and-
 * recreate the merchant invokes, never something ecentic does silently.
 */
export const ReturnPolicyEditor = ({
  store,
  current,
}: {
  store: string;
  current: GoogleMerchant.CurrentReturnPolicy | null;
}) => {
  const toast = useToastManager();
  const router = useRouter();

  const [handleSubmit, isSaving] = useAsyncAction(
    async (data: {
      countries: string;
      window: (typeof RETURN_WINDOWS)[number];
      policyUrl: string;
      methods: (typeof RETURN_METHODS)[number][];
      conditions: (typeof ITEM_CONDITIONS)[number][];
      shipping: (typeof RETURN_SHIPPING)[number];
      refundDays: number;
    }) => {
      const result = await GoogleMerchant.setReturnPolicy({
        store,
        countries: data.countries.split(",").map((country) => country.trim()),
        windowDays:
          data.window === "Lifetime" ? null : Number.parseInt(data.window, 10),
        policyUrl: data.policyUrl,
        returnMethods: data.methods.map(
          (method) => RETURN_METHOD_VALUES[method],
        ),
        itemConditions: data.conditions.map(
          (condition) => ITEM_CONDITION_VALUES[condition],
        ),
        customerPaysShipping: data.shipping === "Customer pays return shipping",
        processRefundDays: data.refundDays,
        replace: current !== null,
      });

      if (!result.success) {
        toast.add({
          title: "Return policy",
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({
        title: current
          ? "Return policy replaced in Merchant Center"
          : "Return policy created in Merchant Center",
        type: "success",
      });
      router.refresh();
    },
  );

  const config = useMemo(
    () =>
      ({
        countries: field({
          shape: "text",
          validator: z
            .string()
            .regex(
              /^[A-Za-z]{2}(\s*,\s*[A-Za-z]{2})*$/,
              "2-letter country codes, comma-separated (e.g. US, GB)",
            ),
          label: "Countries of sale",
          placeholder: "US, GB",
        }),
        window: field({
          shape: "select",
          validator: z.enum(RETURN_WINDOWS),
          label: "Return window",
        }),
        policyUrl: field({
          shape: "text",
          validator: z
            .string()
            .regex(
              /^https?:\/\/\S+\.\S+/,
              "Enter the full URL of your return policy page",
            ),
          label: "Return policy page URL",
          placeholder: "https://your-store.com/policies/returns",
          classList: { field: "flex-1" },
        }),
        methods: field({
          shape: "select",
          validator: z.array(z.enum(RETURN_METHODS)),
          multiple: true,
          label: "Return methods",
        }),
        conditions: field({
          shape: "select",
          validator: z.array(z.enum(ITEM_CONDITIONS)),
          multiple: true,
          label: "Accepted conditions",
        }),
        shipping: field({
          shape: "select",
          validator: z.enum(RETURN_SHIPPING),
          label: "Return shipping cost",
        }),
        refundDays: field({
          shape: "number",
          validator: z
            .number()
            .int()
            .min(1, "At least 1 day")
            .max(60, "At most 60 days"),
          label: "Refund processing time (days)",
        }),
      }) satisfies GenericForm,
    [],
  );

  const currentWindow = (() => {
    switch (true) {
      case current?.lifetime:
        return "Lifetime" as const;
      case RETURN_WINDOWS.includes(
        `${current?.windowDays} days` as (typeof RETURN_WINDOWS)[number],
      ):
        return `${current?.windowDays} days` as (typeof RETURN_WINDOWS)[number];
      default:
        return "30 days" as const;
    }
  })();

  const currentMethods = (current?.returnMethods ?? [])
    .map((method) => RETURN_METHOD_LABELS[method])
    .filter((method) => method !== undefined);
  const currentConditions = (current?.itemConditions ?? [])
    .map((condition) => ITEM_CONDITION_LABELS[condition])
    .filter((condition) => condition !== undefined);

  return (
    <Disclosure label={current ? "Update policy" : "Create policy"}>
      <InferredForm
        config={config}
        defaultValues={{
          countries: current?.countries.join(", ") || "US",
          window: currentWindow,
          policyUrl: current?.policyUrl ?? "",
          methods: currentMethods.length > 0 ? currentMethods : ["By mail"],
          conditions:
            currentConditions.length > 0 ? currentConditions : ["New"],
          shipping: current?.customerPaysShipping
            ? "Customer pays return shipping"
            : "Free return shipping",
          refundDays: current?.processRefundDays ?? 14,
        }}
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <div className="flex flex-col gap-2 sm:col-span-3">
          <Button type="submit" color="neutral" disabled={isSaving}>
            {isSaving
              ? "Saving…"
              : current
                ? "Replace policy in Merchant Center"
                : "Create policy in Merchant Center"}
          </Button>
          {current && (
            <p className="text-foreground-dimmed text-xs">
              Google's API cannot edit a return policy in place — saving
              replaces the existing default policy with this one.
            </p>
          )}
        </div>
      </InferredForm>
    </Disclosure>
  );
};

export const UcpProductsPanel = ({
  store,
  products,
}: {
  store: string;
  products: GoogleMerchant.UcpProduct[];
}) => {
  const toast = useToastManager();
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);

  const [toggle, isToggling] = useAsyncAction(
    async (product: GoogleMerchant.UcpProduct) => {
      const eligible = !(product.ucp?.checkoutEligible ?? false);
      const result = await GoogleMerchant.setUcpProduct({
        store,
        product: product.id,
        checkoutEligible: eligible,
        noticeType: product.ucp?.noticeType ?? null,
        noticeMessage: product.ucp?.noticeMessage ?? null,
        merchantItemId: product.ucp?.merchantItemId ?? null,
      });

      if (!result.success) {
        toast.add({
          title: "Checkout eligibility",
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({
        title: eligible
          ? "Marked eligible — push optimizations to send it to Google"
          : "Marked not eligible — push optimizations to send the opt-out",
        type: "success",
      });
      router.refresh();
    },
  );

  if (products.length === 0)
    return (
      <p className="p-4 text-foreground-dimmed text-sm">
        No synced products yet — sync your store's products first.
      </p>
    );

  return (
    <div className="flex flex-col divide-y divide-accent-foreground">
      {products.map((product) => {
        const eligible = product.ucp?.checkoutEligible ?? false;

        return (
          <div key={product.id} className="flex flex-col gap-2 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="min-w-0 flex-1 truncate font-medium text-foreground text-sm">
                {product.title}
              </p>
              {product.restrictedHints.length > 0 && (
                <Chip tone="warning">
                  may be restricted:{" "}
                  {product.restrictedHints
                    .map((hint) => NOTICE_LABELS[hint] ?? hint)
                    .join(", ")}
                </Chip>
              )}
              {product.offers.live > 0 && (
                <Chip tone="success">{product.offers.live} live</Chip>
              )}
              {product.offers.pending > 0 && (
                <Chip tone="warning">{product.offers.pending} pending</Chip>
              )}
              {product.offers.error > 0 && (
                <Chip tone="error">{product.offers.error} error</Chip>
              )}
              <Button
                color="neutral"
                disabled={isToggling}
                onClick={() => toggle(product)}
              >
                {eligible ? "Eligible ✓ — turn off" : "Enable checkout"}
              </Button>
              <Button
                color="neutral"
                onClick={() =>
                  setExpanded((current) =>
                    current === product.id ? null : product.id,
                  )
                }
              >
                {expanded === product.id ? "Close" : "Notice…"}
              </Button>
            </div>

            {expanded === product.id && (
              <ProductEditor
                store={store}
                product={product}
                onSaved={() => {
                  setExpanded(null);
                  router.refresh();
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
