"use client";

import { ArrowRightIcon, CheckIcon, LoaderIcon } from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  type FormEntries,
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useToastManager } from "@zenncore/web/components/toast";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";

const REDEMPTION_ENDPOINT =
  "/api/webhook/deals/redemptions?merchant=ycombinator";

const batches = [
  "Fall 2025",
  "Summer 2025",
  "Spring 2025",
  "Winter 2025",
  "Summer 2024",
  "Winter 2024",
  "Earlier",
  "Other",
];

const platforms = ["Shopify", "WooCommerce", "Custom / Headless", "Other"];

const monthlyOrders = [
  "Pre-launch",
  "1 – 100",
  "100 – 1,000",
  "1,000 – 10,000",
  "10,000+",
];

const config = {
  companyName: field({
    shape: "text",
    validator: z.string().min(1, "Company name is required"),
    label: "Company name",
    placeholder: "Acme Inc.",
    classList: { field: "col-span-2 md:col-span-1" },
  }),
  batch: field({
    shape: "select",
    validator: z.literal(batches),
    label: "YC batch",
    placeholder: "Select your batch",
    classList: { field: "col-span-2 md:col-span-1" },
  }),
  contactName: field({
    shape: "text",
    validator: z.string().min(1, "Your name is required"),
    label: "Your name",
    placeholder: "Jane Founder",
    classList: { field: "col-span-2 md:col-span-1" },
  }),
  email: field({
    shape: "text",
    validator: z.string().email("Enter a valid email"),
    label: "Work email",
    placeholder: "jane@acme.com",
    classList: { field: "col-span-2 md:col-span-1" },
  }),
  website: field({
    shape: "text",
    validator: z.string().url("Enter a valid URL"),
    label: "Store / website URL",
    placeholder: "https://acme.com",
    classList: { field: "col-span-2" },
  }),
  platform: field({
    shape: "select",
    // @ts-expect-error - optional literal union is not narrowed by the form types
    validator: z.literal(platforms).optional(),
    label: "Commerce platform",
    placeholder: "Select platform",
    classList: { field: "col-span-2 md:col-span-1" },
  }),
  monthlyOrders: field({
    shape: "select",
    // @ts-expect-error - optional literal union is not narrowed by the form types
    validator: z.literal(monthlyOrders).optional(),
    label: "Monthly orders",
    placeholder: "Select range",
    classList: { field: "col-span-2 md:col-span-1" },
  }),
  goal: field({
    shape: "text",
    validator: z.string(),
    label: "What do you want ecentic to help you win? (optional)",
    placeholder: "e.g. Get recommended over our top competitor by AI agents",
    classList: { field: "col-span-2" },
  }),
} satisfies GenericForm;

export const YcRedemptionForm = () => {
  const toast = useToastManager();
  const [submitted, setSubmitted] = useState(false);

  const [handleSubmit, isPending] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      const response = await resultify(() =>
        fetch(REDEMPTION_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
      );

      if (!response.success || !response.data.ok) {
        const message = await (async () => {
          if (!response.success) return "Network error — please try again.";
          const body = await resultify(
            () => response.data.json() as Promise<{ error?: string }>,
          );
          return body.success && body.data.error
            ? body.data.error
            : "Something went wrong — please try again.";
        })();

        toast.add({
          title: "Redemption failed",
          description: message,
          type: "error",
        });
        return;
      }

      setSubmitted(true);
      toast.add({
        title: "Redemption received",
        description:
          "We'll verify your batch and email you within 1 business day.",
        type: "success",
      });
    },
  );

  if (submitted)
    return (
      <div className="flex flex-col items-start gap-4 rounded-lg border border-accent-foreground bg-background-dimmed p-8">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckIcon className="size-6" />
        </div>
        <h3 className="text-2xl text-foreground leading-tight">
          Your deal is reserved
        </h3>
        <p className="max-w-md text-foreground-dimmed leading-relaxed">
          Thanks — we&apos;ve logged your redemption. Our team will confirm your
          YC batch and send activation details to your inbox within one business
          day.
        </p>
        <Button color="primary" render={<Link href="/sign-up" />}>
          Create your account
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    );

  return (
    <InferredForm
      config={config}
      defaultValues={{ goal: "" }}
      onSubmit={handleSubmit}
      className="grid grid-cols-2 gap-x-4 gap-y-1"
    >
      <Button
        type="submit"
        color="primary"
        disabled={isPending}
        className="col-span-2 mt-3 w-full"
      >
        {isPending ? (
          <>
            Redeeming...
            <LoaderIcon className="size-4 animate-spin" />
          </>
        ) : (
          <>
            Redeem my YC deal
            <ArrowRightIcon className="size-4" />
          </>
        )}
      </Button>
    </InferredForm>
  );
};
