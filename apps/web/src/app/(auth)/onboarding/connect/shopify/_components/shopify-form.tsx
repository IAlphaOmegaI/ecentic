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
import { z } from "zod";

const config = {
  shop: field({
    shape: "text",
    validator: z.string().min(1, "Shop domain is required"),
    label: "Shop Domain",
    placeholder: "yourstore.myshopify.com",
    // @ts-expect-error - description is a function
    description: () => (
      <FieldDescription>
        The subdomain you use to access Shopify admin. If your admin URL is{" "}
        <span className="font-medium text-foreground">
          acmestore.myshopify.com/admin
        </span>
        , enter <span className="font-medium text-foreground">acmestore</span>{" "}
        or the full{" "}
        <span className="font-medium text-foreground">
          acmestore.myshopify.com
        </span>
        .
      </FieldDescription>
    ),
  }),
} satisfies GenericForm;

export const ShopifyForm = () => {
  const [handleSubmit, isPending] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      const shop = data.shop.trim();
      window.location.href = `/api/integrations/shopify/install?shop=${encodeURIComponent(shop)}`;
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
        variant="flat"
        color="primary"
        className="mt-2 w-full"
        disabled={isPending}
      >
        Connect to Shopify
        {isPending ? (
          <LoaderIcon className="size-4 animate-spin" />
        ) : (
          <ArrowRightIcon className="size-4" />
        )}
      </Button>
    </InferredForm>
  );
};
