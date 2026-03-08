"use client";

import { ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  type FormEntries,
  type GenericForm,
  InferredForm,
  field,
} from "@zenncore/web/components/inferred-form";
import { useToastManager } from "@zenncore/web/components/toast";
import { useRouter } from "next/navigation";
import { z } from "zod";
import * as WooCommerceIntegration from "@/server/app/integration/woocommerce";
import * as Sync from "@/server/app/sync";

const config = {
  domain: field({
    shape: "text",
    validator: z.string().min(1, "Store URL is required"),
    label: "Store URL",
    placeholder: "https://yourstore.com",
  }),
  consumerKey: field({
    shape: "text",
    validator: z.string().min(1, "Consumer key is required"),
    label: "Consumer Key",
    placeholder: "ck_...",
  }),
  consumerSecret: field({
    shape: "text",
    type: "password",
    validator: z.string().min(1, "Consumer secret is required"),
    label: "Consumer Secret",
    placeholder: "cs_...",
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
        description: "Syncing products — this may take a moment.",
        type: "success",
      });

      void (async () => {
        await Sync.syncStore({ storeId: result.data.id });
      })();

      router.push("/onboarding/select-products");
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
