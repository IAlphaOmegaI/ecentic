"use client";

import { ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { useRouter } from "@/i18n/navigation";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  type FormEntries,
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useToastManager } from "@zenncore/web/components/toast";
import { z } from "zod";
import { parseCsvProducts } from "@/lib/csv";
import * as CsvIntegration from "@/server/app/integration/csv";

const config = {
  file: field({
    shape: "file",
    mode: "single",
    accept: [".csv"],
    label: "Upload a CSV file",
    description: "Upload a CSV file to import your products.",
    validator: z.file(),
    classList: {
      control: {
        input: "h-auto p-10",
      },
    },
  }),
} satisfies GenericForm;

export const CsvForm = () => {
  const router = useRouter();
  const toast = useToastManager();

  const [handleSubmit, isPending] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      const file = data.file as File | null;

      if (!file) {
        toast.add({
          title: "No file selected",
          description: "Upload a CSV file first.",
          type: "error",
        });
        return;
      }

      const text = await file.text();
      const products = parseCsvProducts(text);

      if (products.length === 0) {
        toast.add({
          title: "No products found",
          description:
            "Check that your CSV has a header row with a title or name column.",
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
          title: "Import failed",
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
          title: "Import failed",
          description: sync.error.message,
          type: "error",
        });
        return;
      }

      toast.add({
        title: `${sync.data} product${sync.data !== 1 ? "s" : ""} imported`,
        description: "Your catalog is ready.",
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
            Importing...
            <LoaderIcon className="size-4 animate-spin" />
          </>
        ) : (
          <>
            Import CSV
            <ArrowRightIcon className="size-4" />
          </>
        )}
      </Button>
    </InferredForm>
  );
};
