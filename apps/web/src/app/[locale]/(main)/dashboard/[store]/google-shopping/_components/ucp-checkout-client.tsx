"use client";

import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useToastManager } from "@zenncore/web/components/toast";
import { useRouter } from "next/navigation";
import { useMessages, useTranslations } from "next-intl";
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
 *
 * Every select stores the API's own code as its value and takes its labels from
 * the message catalog, so translating a label never changes what we send to
 * Google.
 */

const NOTICE_TYPES = [
  "none",
  "legal_disclaimer",
  "safety_warning",
  "prop_65",
] as const;

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
  const translate = useTranslations("dashboard.googleShopping.forms");
  const messages = useMessages();

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
          title: translate("notice.toast"),
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({ title: translate("notice.saved"), type: "success" });
      onSaved();
    },
  );

  const config = useMemo(
    () =>
      ({
        noticeType: field({
          shape: "select",
          validator: z.enum(NOTICE_TYPES),
          label: translate("notice.type.label"),
          items: messages.dashboard.googleShopping.forms.notice.type.items,
        }),
        noticeMessage: field({
          shape: "text",
          validator: z.string().max(1000, translate("notice.message.max")),
          label: translate("notice.message.label"),
          placeholder: translate("notice.message.placeholder"),
          classList: { field: "flex-1" },
        }),
        merchantItemId: field({
          shape: "text",
          validator: z.string(),
          label: translate("notice.itemId.label"),
          placeholder: translate("notice.itemId.placeholder"),
        }),
      }) satisfies GenericForm,
    [translate, messages],
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
        {isSaving ? translate("saving") : translate("notice.save")}
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
  const translate = useTranslations("dashboard.googleShopping.forms");
  const [open, setOpen] = useState(false);

  return (
    // `@container` so the forms below track the card's width, not the
    // viewport's — these cards sit in a half-width grid next to a sidebar.
    <div className="@container flex flex-col gap-3 px-4 pb-4">
      <div>
        <Button color="neutral" onClick={() => setOpen((current) => !current)}>
          {open ? translate("hide") : label}
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
  const translate = useTranslations("dashboard.googleShopping.forms");

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
          title: translate("support.toast"),
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({
        title: translate("support.saved"),
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
          label: translate("support.website.label"),
          placeholder: translate("support.website.placeholder"),
          classList: { field: "@md:col-span-full @2xl:col-span-1" },
        }),
        email: field({
          shape: "text",
          validator: z.string(),
          label: translate("support.email.label"),
          placeholder: translate("support.email.placeholder"),
        }),
        phone: field({
          shape: "text",
          validator: z.string(),
          label: translate("support.phone.label"),
          placeholder: translate("support.phone.placeholder"),
        }),
      }) satisfies GenericForm,
    [translate],
  );

  const configured = Boolean(current.email || current.uri || current.phone);

  return (
    <Disclosure
      label={
        configured ? translate("support.update") : translate("support.open")
      }
    >
      <InferredForm
        config={config}
        defaultValues={{
          website: current.uri ?? "",
          email: current.email ?? "",
          phone: current.phone ?? "",
        }}
        onSubmit={handleSubmit}
        className="grid @2xl:grid-cols-3 @md:grid-cols-2 grid-cols-1 gap-3"
      >
        <Button
          type="submit"
          color="neutral"
          className="col-span-full w-fit"
          disabled={isSaving}
        >
          {isSaving ? translate("saving") : translate("support.save")}
        </Button>
      </InferredForm>
    </Disclosure>
  );
};

const RETURN_WINDOWS = ["14", "30", "60", "90", "lifetime"] as const;
const RETURN_METHODS = ["BY_MAIL", "IN_STORE", "AT_A_KIOSK"] as const;
const ITEM_CONDITIONS = ["NEW", "USED"] as const;
const RETURN_SHIPPING = ["free", "customer"] as const;

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
  const translate = useTranslations("dashboard.googleShopping.forms");
  const messages = useMessages();

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
          data.window === "lifetime" ? null : Number.parseInt(data.window, 10),
        policyUrl: data.policyUrl,
        returnMethods: data.methods,
        itemConditions: data.conditions,
        customerPaysShipping: data.shipping === "customer",
        processRefundDays: data.refundDays,
        replace: current !== null,
      });

      if (!result.success) {
        toast.add({
          title: translate("returnPolicy.toast"),
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({
        title: current
          ? translate("returnPolicy.replaced")
          : translate("returnPolicy.created"),
        type: "success",
      });
      router.refresh();
    },
  );

  const config = useMemo(() => {
    const items = messages.dashboard.googleShopping.forms.returnPolicy;

    return {
      countries: field({
        shape: "text",
        validator: z
          .string()
          .regex(
            /^[A-Za-z]{2}(\s*,\s*[A-Za-z]{2})*$/,
            translate("returnPolicy.countries.invalid"),
          ),
        label: translate("returnPolicy.countries.label"),
        placeholder: translate("returnPolicy.countries.placeholder"),
      }),
      window: field({
        shape: "select",
        validator: z.enum(RETURN_WINDOWS),
        label: translate("returnPolicy.window.label"),
        items: items.window.items,
      }),
      policyUrl: field({
        shape: "text",
        validator: z
          .string()
          .regex(
            /^https?:\/\/\S+\.\S+/,
            translate("returnPolicy.policyUrl.invalid"),
          ),
        label: translate("returnPolicy.policyUrl.label"),
        placeholder: translate("returnPolicy.policyUrl.placeholder"),
        classList: { field: "@md:col-span-full @2xl:col-span-1" },
      }),
      methods: field({
        shape: "select",
        validator: z.array(z.enum(RETURN_METHODS)),
        multiple: true,
        label: translate("returnPolicy.methods.label"),
        items: items.methods.items,
      }),
      conditions: field({
        shape: "select",
        validator: z.array(z.enum(ITEM_CONDITIONS)),
        multiple: true,
        label: translate("returnPolicy.conditions.label"),
        items: items.conditions.items,
      }),
      shipping: field({
        shape: "select",
        validator: z.enum(RETURN_SHIPPING),
        label: translate("returnPolicy.shipping.label"),
        items: items.shipping.items,
      }),
      refundDays: field({
        shape: "number",
        validator: z
          .number()
          .int()
          .min(1, translate("returnPolicy.refundDays.min"))
          .max(60, translate("returnPolicy.refundDays.max")),
        label: translate("returnPolicy.refundDays.label"),
      }),
    } satisfies GenericForm;
  }, [translate, messages]);

  const currentWindow = (() => {
    switch (true) {
      case current?.lifetime:
        return "lifetime" as const;
      case RETURN_WINDOWS.includes(
        `${current?.windowDays}` as (typeof RETURN_WINDOWS)[number],
      ):
        return `${current?.windowDays}` as (typeof RETURN_WINDOWS)[number];
      default:
        return "30" as const;
    }
  })();

  const currentMethods = (current?.returnMethods ?? []).filter(
    (method): method is (typeof RETURN_METHODS)[number] =>
      RETURN_METHODS.includes(method as (typeof RETURN_METHODS)[number]),
  );
  const currentConditions = (current?.itemConditions ?? []).filter(
    (condition): condition is (typeof ITEM_CONDITIONS)[number] =>
      ITEM_CONDITIONS.includes(condition as (typeof ITEM_CONDITIONS)[number]),
  );

  return (
    <Disclosure
      label={
        current
          ? translate("returnPolicy.update")
          : translate("returnPolicy.open")
      }
    >
      <InferredForm
        config={config}
        defaultValues={{
          countries: current?.countries.join(", ") || "US",
          window: currentWindow,
          policyUrl: current?.policyUrl ?? "",
          methods: currentMethods.length > 0 ? currentMethods : ["BY_MAIL"],
          conditions:
            currentConditions.length > 0 ? currentConditions : ["NEW"],
          shipping: current?.customerPaysShipping ? "customer" : "free",
          refundDays: current?.processRefundDays ?? 14,
        }}
        onSubmit={handleSubmit}
        className="grid @2xl:grid-cols-3 @md:grid-cols-2 grid-cols-1 gap-3"
      >
        <div className="col-span-full flex flex-col gap-2">
          <Button type="submit" color="neutral" disabled={isSaving}>
            {isSaving
              ? translate("saving")
              : current
                ? translate("returnPolicy.submitReplace")
                : translate("returnPolicy.submitCreate")}
          </Button>
          {current && (
            <p className="text-foreground-dimmed text-xs">
              {translate("returnPolicy.replaceNote")}
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
  const translate = useTranslations("dashboard.googleShopping.products");
  const messages = useMessages();
  const [expanded, setExpanded] = useState<string | null>(null);

  // Hints come from a heuristic that can name a category the catalog has no
  // label for yet — fall back to the raw code rather than throwing on it.
  const hints: Record<string, string> =
    messages.dashboard.googleShopping.products.hints;

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
          title: translate("toast"),
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({
        title: eligible ? translate("enabled") : translate("disabled"),
        type: "success",
      });
      router.refresh();
    },
  );

  if (products.length === 0)
    return (
      <p className="p-4 text-foreground-dimmed text-sm">{translate("empty")}</p>
    );

  const eligibleCount = products.filter(
    (product) => product.ucp?.checkoutEligible ?? false,
  ).length;

  return (
    <div className="col-span-full bg-background-rich">
      <div className="grid gap-px border-accent-foreground border-b bg-accent-foreground sm:grid-cols-3">
        <div className="bg-background-rich p-5">
          <p className="font-bold text-2xl text-foreground tabular-nums">
            {products.length}
          </p>
          <p className="mt-1 text-foreground-dimmed text-xs">
            {translate("summary.catalog")}
          </p>
        </div>
        <div className="bg-background-rich p-5">
          <p className="font-bold text-2xl text-primary tabular-nums">
            {eligibleCount}
          </p>
          <p className="mt-1 text-foreground-dimmed text-xs">
            {translate("summary.eligible")}
          </p>
        </div>
        <div className="bg-background-rich p-5">
          <p className="font-bold text-2xl text-warning tabular-nums">
            {
              products.filter((product) => product.restrictedHints.length > 0)
                .length
            }
          </p>
          <p className="mt-1 text-foreground-dimmed text-xs">
            {translate("summary.review")}
          </p>
        </div>
      </div>

      <div className="grid gap-px bg-accent-foreground lg:grid-cols-2">
        {products.map((product) => {
          const eligible = product.ucp?.checkoutEligible ?? false;

          return (
            <div
              key={product.id}
              className={cn(
                "flex min-h-36 flex-col bg-background-rich p-5 sm:p-6",
                eligible && "border-primary border-l-2",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="min-w-0 font-medium text-foreground text-sm leading-5">
                  {product.title}
                </p>
                <Chip tone={eligible ? "success" : "neutral"}>
                  {eligible ? translate("disable") : translate("enable")}
                </Chip>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {product.restrictedHints.length > 0 && (
                  <Chip tone="warning">
                    {translate("restricted", {
                      hints: product.restrictedHints
                        .map((hint) => hints[hint] ?? hint)
                        .join(", "),
                    })}
                  </Chip>
                )}
                {product.offers.live > 0 && (
                  <Chip tone="success">
                    {translate("live", { count: product.offers.live })}
                  </Chip>
                )}
                {product.offers.pending > 0 && (
                  <Chip tone="warning">
                    {translate("pending", { count: product.offers.pending })}
                  </Chip>
                )}
                {product.offers.error > 0 && (
                  <Chip tone="error">
                    {translate("error", { count: product.offers.error })}
                  </Chip>
                )}
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                <Button disabled={isToggling} onClick={() => toggle(product)}>
                  {eligible ? translate("disable") : translate("enable")}
                </Button>
                <Button
                  color="neutral"
                  onClick={() =>
                    setExpanded((current) =>
                      current === product.id ? null : product.id,
                    )
                  }
                >
                  {expanded === product.id
                    ? translate("close")
                    : translate("notice")}
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
    </div>
  );
};
