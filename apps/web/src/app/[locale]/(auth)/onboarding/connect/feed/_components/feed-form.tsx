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
import { useRouter } from "@/i18n/navigation";
import * as FeedIntegration from "@/server/app/integration/feed";
import * as Store from "@/server/app/store";

export const FeedForm = () => {
  const router = useRouter();
  const toast = useToastManager();
  const translate = useTranslations("onboarding.connect");

  const config = useMemo(
    () =>
      ({
        feedUrl: field({
          shape: "text",
          validator: z
            .string()
            .url(translate("feed.fields.feedUrl.validation")),
          label: translate("feed.fields.feedUrl.label"),
          placeholder: translate("feed.fields.feedUrl.placeholder"),
          // @ts-expect-error - description is a function
          description: () => (
            <FieldDescription>
              {translate("feed.fields.feedUrl.description.before")}{" "}
              <span className="font-medium text-foreground">
                {translate("feed.fields.feedUrl.description.example")}
              </span>
              . {translate("feed.fields.feedUrl.description.after")}
            </FieldDescription>
          ),
        }),
      }) satisfies GenericForm,
    [translate],
  );

  const [handleSubmit, isPending] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      const result = await FeedIntegration.connect(data);

      if (!result.success) {
        toast.add({
          title: translate("feed.toast.connectionFailed"),
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({
        title: translate("feed.toast.connected.title"),
        description: translate("feed.toast.connected.description"),
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
            {translate("feed.action.importing")}
            <LoaderIcon className="size-4 animate-spin" />
          </>
        ) : (
          <>
            {translate("feed.action.primary")}
            <ArrowRightIcon className="size-4" />
          </>
        )}
      </Button>
    </InferredForm>
  );
};
