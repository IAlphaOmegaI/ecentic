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
import { useRouter } from "next/navigation";
import { z } from "zod";
import * as WooCommerceIntegration from "@/server/app/integration/woocommerce";

const config = {
  domain: field({
    shape: "text",
    validator: z.string().min(1, "Store URL is required"),
    label: "Store URL",
    placeholder: "https://yourstore.com",
    // @ts-expect-error - description is a function
    description: () => (
      <FieldDescription>
        The public URL of your WooCommerce store — for example{" "}
        <span className="font-medium text-foreground">
          https://acmestore.com
        </span>
        . This is the homepage, not the WordPress admin URL.
      </FieldDescription>
    ),
  }),
  consumerKey: field({
    shape: "text",
    validator: z.string().min(1, "Consumer key is required"),
    label: "Consumer Key",
    placeholder: "ck_...",
    description: () => (
      <FieldDescription>
        The key WooCommerce generated for you. It always starts with{" "}
        <code className="text-foreground">ck_</code> followed by a long
        alphanumeric string. We use this to authenticate read-only API requests.
      </FieldDescription>
    ),
  }),
  consumerSecret: field({
    shape: "text",
    type: "password",
    validator: z.string().min(1, "Consumer secret is required"),
    label: "Consumer Secret",
    placeholder: "cs_...",
    description: () => (
      <FieldDescription>
        The secret that pairs with the key — starts with{" "}
        <code className="text-foreground">cs_</code>. This is only shown once
        when you generate the key, so make sure to copy it before leaving
        WooCommerce.
      </FieldDescription>
    ),
  }),
} satisfies GenericForm;

export const WooCommerceForm = () => {
  const router = useRouter();
  const toast = useToastManager();

  const [handleSubmit, isPending] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      const result = await WooCommerceIntegration.connect(data);

      if (!result.success) {
        toast.add({
          title: "Connection failed",
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({
        title: "Store connected",
        description: "Your catalog is synced and ready.",
        type: "success",
      });

      router.push("/onboarding/products?connected=woocommerce");
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
        disabled={isPending}
        className="mt-2 w-full"
      >
        {isPending ? (
          <>
            Connecting...
            <LoaderIcon className="size-4 animate-spin" />
          </>
        ) : (
          <>
            Connect WooCommerce
            <ArrowRightIcon className="size-4" />
          </>
        )}
      </Button>
    </InferredForm>
  );
};
