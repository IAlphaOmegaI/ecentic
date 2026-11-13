"use client";

import { ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { FieldDescription } from "@zenncore/web/components/form";
import {
  type FormEntries,
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useToastManager } from "@zenncore/web/components/toast";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { z } from "zod";
import { useOnboardingError } from "@/app/[locale]/(auth)/onboarding/_components/use-onboarding-error";
import { useRouter } from "@/i18n/navigation";
import { callOnboardingAction } from "@/lib/onboarding-errors";
import * as WooCommerce from "@/server/app/integration/woocommerce";

export const WooCommerceForm = () => {
  const router = useRouter();
  const toast = useToastManager();
  const formatError = useOnboardingError();
  const translate = useTranslations("onboarding.connect");
  const password = useTranslations("authUX.password");

  const config = useMemo(
    () =>
      ({
        domain: field({
          shape: "text",
          validator: z
            .string({
              error: translate("woocommerce.fields.domain.validation"),
            })
            .trim()
            .min(1, translate("woocommerce.fields.domain.validation")),
          label: translate("woocommerce.fields.domain.label"),
          placeholder: translate("woocommerce.fields.domain.placeholder"),
          // @ts-expect-error - description is a function
          description: () => (
            <FieldDescription>
              {translate("woocommerce.fields.domain.description.before")}{" "}
              <span className="font-medium text-foreground">
                {translate("woocommerce.fields.domain.description.example")}
              </span>
              {translate("woocommerce.fields.domain.description.after")}
            </FieldDescription>
          ),
        }),
        consumerKey: field({
          shape: "text",
          validator: z
            .string({
              error: translate("woocommerce.fields.consumerKey.validation"),
            })
            .trim()
            .min(1, translate("woocommerce.fields.consumerKey.validation")),
          label: translate("woocommerce.fields.consumerKey.label"),
          placeholder: translate("woocommerce.fields.consumerKey.placeholder"),
          // @ts-expect-error - description is a function
          description: () => (
            <FieldDescription>
              {translate("woocommerce.fields.consumerKey.description")}
            </FieldDescription>
          ),
        }),
        consumerSecret: field({
          shape: "text",
          type: "password",
          maskToggleLabels: { show: password("show"), hide: password("hide") },
          validator: z
            .string({
              error: translate("woocommerce.fields.consumerSecret.validation"),
            })
            .trim()
            .min(1, translate("woocommerce.fields.consumerSecret.validation")),
          label: translate("woocommerce.fields.consumerSecret.label"),
          placeholder: translate(
            "woocommerce.fields.consumerSecret.placeholder",
          ),
          // @ts-expect-error - description is a function
          description: () => (
            <FieldDescription>
              {translate("woocommerce.fields.consumerSecret.description")}
            </FieldDescription>
          ),
        }),
      }) satisfies GenericForm,
    [translate, password],
  );

  const [handleSubmit, isPending] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      const result = await callOnboardingAction(() =>
        WooCommerce.connect(data),
      );

      if (!result.success) {
        toast.add({
          title: translate("woocommerce.toast.connectionFailed"),
          description: formatError(result.error),
          type: "error",
        });
        return;
      }

      toast.add({
        title: translate("woocommerce.toast.connected.title"),
        description: translate("woocommerce.toast.connected.description"),
        type: "success",
      });

      router.push(
        result.data.reconnected
          ? `/dashboard/${result.data.store.id}`
          : "/onboarding/products?connected=woocommerce",
      );
    },
  );

  return (
    <InferredForm
      config={config}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      <Button
        type="submit"
        color="primary"
        disabled={isPending}
        className="mt-2 w-full"
      >
        {isPending ? (
          <>
            {translate("woocommerce.action.connecting")}
            <LoaderIcon className="size-4 animate-spin" />
          </>
        ) : (
          <>
            {translate("woocommerce.action.primary")}
            <ArrowRightIcon className="size-4" />
          </>
        )}
      </Button>
    </InferredForm>
  );
};
