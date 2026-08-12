"use client";

import { ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
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
import { parseCsvProducts } from "@/lib/csv";
import * as CsvIntegration from "@/server/app/integration/csv";

export const CsvForm = () => {
  const router = useRouter();
  const toast = useToastManager();
  const translate = useTranslations("onboarding.connect");

  const config = useMemo(
    () =>
      ({
        file: field({
          shape: "file",
          mode: "single",
          accept: [".csv"],
          label: translate("csv.fields.file.label"),
          description: translate("csv.fields.file.description"),
          validator: z.file(),
          classList: {
            control: {
              input: "h-auto p-10",
            },
          },
        }),
      }) satisfies GenericForm,
    [translate],
  );

  const [handleSubmit, isPending] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      const file = data.file as File | null;

      if (!file) {
        toast.add({
          title: translate("csv.toast.noFile.title"),
          description: translate("csv.toast.noFile.description"),
          type: "error",
        });
        return;
      }

      const text = await file.text();
      const products = parseCsvProducts(text);

      if (products.length === 0) {
        toast.add({
          title: translate("csv.toast.noProducts.title"),
          description: translate("csv.toast.noProducts.description"),
          type: "error",
        });
        return;
      }

      const result = await CsvIntegration.connect({
        products,
        filename: file.name,
      });

      if (!result.success) {
        toast.add({
          title: translate("csv.toast.importFailed"),
          description: result.error.message,
          type: "error",
        });
        return;
      }

      const sync = await CsvIntegration.syncProducts({
        store: result.data.id,
        products,
      });

      if (!sync.success) {
        toast.add({
          title: translate("csv.toast.importFailed"),
          description: sync.error.message,
          type: "error",
        });
        return;
      }

      toast.add({
        title: translate("csv.toast.imported.title", { count: sync.data }),
        description: translate("csv.toast.imported.description"),
        type: "success",
      });

      router.push("/onboarding/products");
    },
  );

  return (
    <InferredForm
      config={config}
      onSubmit={handleSubmit}
      onChange={(values) => {
        const file = (values as { file: File | null }).file;
        if (!file) return;
      }}
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
            {translate("csv.action.importing")}
            <LoaderIcon className="size-4 animate-spin" />
          </>
        ) : (
          <>
            {translate("csv.action.primary")}
            <ArrowRightIcon className="size-4" />
          </>
        )}
      </Button>
    </InferredForm>
  );
};
