"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import {
  type FormEntries,
  type GenericForm,
  InferredForm,
  field,
} from "@zenncore/web/components/inferred-form";
import { z } from "zod";

const config = {
  shop: field({
    shape: "text",
    validator: z.string().min(1, "Shop domain is required"),
    label: "Shop Domain",
    placeholder: "yourstore.myshopify.com",
  }),
} satisfies GenericForm;

export const ShopifyForm = () => {
  const handleSubmit = (data: FormEntries<typeof config>) => {
    const shop = data.shop.trim();
    window.location.href = `/api/integrations/shopify/install?shop=${encodeURIComponent(shop)}`;
  };

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
      >
        Connect to Shopify
        <ArrowRightIcon className="size-4" />
      </Button>
    </InferredForm>
  );
};
