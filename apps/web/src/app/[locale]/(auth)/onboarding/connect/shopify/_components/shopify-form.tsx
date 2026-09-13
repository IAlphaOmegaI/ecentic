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
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { z } from "zod";
import { useCurrentUser } from "@/context/auth";
import { useRouter } from "@/i18n/navigation";
import * as Shopify from "@/server/app/integration/shopify";

export const ShopifyForm = () => {
  const router = useRouter();
  const toast = useToastManager();
  const user = useCurrentUser();
  const translate = useTranslations("onboarding.connect");
  const searchParameters = useSearchParams();
  const errorCode = searchParameters.get("error");

  const errorMessage = (() => {
    if (!errorCode) return null;

    switch (errorCode) {
      case "missing_parameters":
      case "invalid_state":
      case "invalid_hmac":
      case "already_connected":
        return translate(`shopify.errors.${errorCode}`);
      case "invalid-shop":
        return translate("shopify.errors.invalidShop");
      default:
        return translate("shopify.errors.generic");
    }
  })();

  const config = useMemo(
    () =>
      ({
        shop: field({
          shape: "text",
          validator: z
            .string()
            .min(1, translate("shopify.fields.shop.validation")),
          label: translate("shopify.fields.shop.label"),
          placeholder: translate("shopify.fields.shop.placeholder"),
          // @ts-expect-error - description is a function
          description: () => (
            <FieldDescription>
              {translate("shopify.fields.shop.description.beforeExample")}{" "}
              <span className="font-medium text-foreground">
                {translate("shopify.fields.shop.description.exampleAdmin")}
              </span>
              {translate("shopify.fields.shop.description.middle")}{" "}
              <span className="font-medium text-foreground">
                {translate("shopify.fields.shop.description.exampleHandle")}
              </span>{" "}
              {translate("shopify.fields.shop.description.orFull")}{" "}
              <span className="font-medium text-foreground">
                {translate("shopify.fields.shop.description.exampleDomain")}
              </span>
              .
            </FieldDescription>
          ),
        }),
      }) satisfies GenericForm,
    [translate],
  );

  const [handleSubmit, isPending] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      if (user.role === "administrator" || user.role === "owner") {
        window.location.href = `/api/integrations/shopify/install?shop=${encodeURIComponent(data.shop.trim())}`;
        return;
      }

      const result = await Shopify.connectPublic({
        domain: data.shop.trim(),
      });

      if (!result.success) {
        toast.add({
          title: translate("shopify.toast.connectionFailed"),
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({
        title: translate("shopify.toast.connected.title"),
        description: translate("shopify.toast.connected.description"),
        type: "success",
      });

      // A re-import of a store this user already onboarded skips the product
      // picker, which would otherwise let them select past their plan's limit.
      router.push(
        result.data.reconnected
          ? `/dashboard/${result.data.store.id}`
          : "/onboarding/products?connected=shopify",
      );
    },
  );

  return (
    <InferredForm
      config={config}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      {errorMessage && (
        <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 font-light text-error text-sm">
          {errorMessage}
        </p>
      )}
      <Button
        type="submit"
        color="primary"
        className="mt-2 w-full"
        disabled={isPending}
      >
        {isPending ? (
          <>
            {translate("shopify.action.connecting")}
            <LoaderIcon className="size-4 animate-spin" />
          </>
        ) : (
          <>
            {translate("shopify.action.primary")}
            <ArrowRightIcon className="size-4" />
          </>
        )}
      </Button>
    </InferredForm>
  );
};
