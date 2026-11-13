"use client";

import { ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
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
import { useFormatter, useTranslations } from "next-intl";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";

const platforms = ["Shopify", "WooCommerce", "Custom / Headless", "Other"];

const monthlyOrders = [
  "Pre-launch",
  "1 – 100",
  "100 – 1,000",
  "1,000 – 10,000",
  "10,000+",
];

type Props = {
  /** Deal program this form redeems against, e.g. "ycombinator". */
  merchant: "techstars" | "ycombinator";
  batches: readonly string[];
  /** Where to send the founder once the redemption is recorded. */
  redirectTo?: string;
};

export const DealRedemptionForm = ({
  merchant,
  batches,
  redirectTo = "/sign-up",
}: Props) => {
  const router = useRouter();
  const toast = useToastManager();
  const translate = useTranslations("dealRedemption");
  const format = useFormatter();
  const program = merchant === "techstars" ? "techstars" : "yc";
  const cohortLabel = (value: string) => {
    if (value === "Earlier") return translate("options.earlier");
    if (value === "Other") return translate("options.other");
    const [season, year] = value.split(" ");
    switch (season) {
      case "Winter":
        return translate("cohorts.winter", { year: year ?? "" });
      case "Spring":
        return translate("cohorts.spring", { year: year ?? "" });
      case "Summer":
        return translate("cohorts.summer", { year: year ?? "" });
      case "Fall":
        return translate("cohorts.fall", { year: year ?? "" });
      default:
        return value;
    }
  };

  const config = {
    companyName: field({
      shape: "text",
      validator: z.string().min(1, translate("fields.companyName.required")),
      label: translate("fields.companyName.label"),
      placeholder: translate("fields.companyName.placeholder"),
      classList: { field: "col-span-2 md:col-span-1" },
    }),
    batch: field({
      shape: "select",
      validator: z.literal([...batches]),
      label: translate(`programs.${program}.batchLabel`),
      placeholder: translate(`programs.${program}.batchPlaceholder`),
      items: batches.map((value) => ({ value, label: cohortLabel(value) })),
      classList: { field: "col-span-2 md:col-span-1" },
    }),
    contactName: field({
      shape: "text",
      validator: z.string().min(1, translate("fields.contactName.required")),
      label: translate("fields.contactName.label"),
      placeholder: translate("fields.contactName.placeholder"),
      classList: { field: "col-span-2 md:col-span-1" },
    }),
    email: field({
      shape: "text",
      validator: z.string().email(translate("fields.email.invalid")),
      label: translate("fields.email.label"),
      placeholder: translate("fields.email.placeholder"),
      classList: { field: "col-span-2 md:col-span-1" },
    }),
    website: field({
      shape: "text",
      validator: z.string().url(translate("fields.website.invalid")),
      label: translate("fields.website.label"),
      placeholder: translate("fields.website.placeholder"),
      classList: { field: "col-span-2" },
    }),
    platform: field({
      shape: "select",
      // @ts-expect-error - optional literal union is not narrowed by the form types
      validator: z.literal(platforms).optional(),
      items: platforms.map((value) => ({
        value,
        label:
          value === "Other"
            ? translate("options.other")
            : value === "Custom / Headless"
              ? translate("options.customHeadless")
              : value,
      })),
      label: translate("fields.platform.label"),
      placeholder: translate("fields.platform.placeholder"),
      classList: { field: "col-span-2 md:col-span-1" },
    }),
    monthlyOrders: field({
      shape: "select",
      // @ts-expect-error - optional literal union is not narrowed by the form types
      validator: z.literal(monthlyOrders).optional(),
      items: monthlyOrders.map((value) => ({
        value,
        label:
          value === "Pre-launch"
            ? translate("options.preLaunch")
            : value.replace(/\d+(?:,\d{3})*/g, (number) =>
                format.number(Number(number.replaceAll(",", ""))),
              ),
      })),
      label: translate("fields.monthlyOrders.label"),
      placeholder: translate("fields.monthlyOrders.placeholder"),
      classList: { field: "col-span-2 md:col-span-1" },
    }),
    goal: field({
      shape: "text",
      validator: z.string(),
      label: translate("fields.goal.label"),
      placeholder: translate("fields.goal.placeholder"),
      classList: { field: "col-span-2" },
    }),
  } satisfies GenericForm;

  const [handleSubmit, isPending] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      const response = await resultify(() =>
        fetch(`/api/webhook/deals/redemptions?merchant=${merchant}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
      );

      if (!response.success || !response.data.ok) {
        const message = await (async () => {
          if (!response.success) return translate("toast.networkError");
          const body = await resultify(
            () => response.data.json() as Promise<{ error?: string }>,
          );
          return body.success && body.data.error
            ? body.data.error
            : translate("toast.genericError");
        })();

        toast.add({
          title: translate("toast.failedTitle"),
          description: message,
          type: "error",
        });
        return;
      }

      toast.add({
        title: translate("toast.successTitle"),
        description: translate("toast.successDescription"),
        type: "success",
      });
      router.push(redirectTo);
    },
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
            {translate("action.pending")}
            <LoaderIcon className="size-4 animate-spin" />
          </>
        ) : (
          <>
            {translate(`programs.${program}.action.primary`)}
            <ArrowRightIcon className="size-4" />
          </>
        )}
      </Button>
    </InferredForm>
  );
};
