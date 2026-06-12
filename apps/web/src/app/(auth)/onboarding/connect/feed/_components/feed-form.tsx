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
import * as FeedIntegration from "@/server/app/integration/feed";
import * as Store from "@/server/app/store";

const config = {
  feedUrl: field({
    shape: "text",
    validator: z.string().url("Enter a valid URL"),
    label: "Feed URL",
    placeholder: "https://yourstore.com/products.xml",
    // @ts-expect-error - description is a function
    description: () => (
      <FieldDescription>
        The publicly accessible URL that serves your product feed. For example:{" "}
        <span className="font-medium text-foreground">
          https://yourstore.com/feed/products.xml
        </span>
        . The URL must be reachable from the internet — localhost or
        private-network URLs won&apos;t work. We auto-detect whether it&apos;s
        XML or JSON based on the content.
      </FieldDescription>
    ),
  }),
} satisfies GenericForm;

export const FeedForm = () => {
  const router = useRouter();
  const toast = useToastManager();

  const [handleSubmit, isPending] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      const result = await FeedIntegration.connect(data);

      if (!result.success) {
        toast.add({
          title: "Connection failed",
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({
        title: "Feed connected",
        description: "Importing products — this may take a moment.",
        type: "success",
      });
      void (async () => {
        await Store.syncProducts({ store: result.data.id });
      })();

      router.push("/onboarding/products");
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
            Importing...
            <LoaderIcon className="size-4 animate-spin" />
          </>
        ) : (
          <>
            Import Feed
            <ArrowRightIcon className="size-4" />
          </>
        )}
      </Button>
    </InferredForm>
  );
};
