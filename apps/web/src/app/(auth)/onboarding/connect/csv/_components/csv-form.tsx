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
import { useRouter } from "next/navigation";
import { z } from "zod";
import * as CsvIntegration from "@/server/app/integration/csv";

const parseCSV = (text: string): CsvIntegration.Type[] => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = (lines[0] ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

  return lines.slice(1).flatMap((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.every((v) => v === "")) return [];

    const row = Object.fromEntries(
      headers.map((header, i) => [header, values[i] ?? ""]),
    ) as CsvIntegration.Type & {
      name?: string;
      image_link?: string;
      image_url?: string;
      link?: string;
    };

    const title = row.title ?? row.name;
    if (!title) return [];

    return [
      {
        title,
        description: row.description,
        price: row.price,
        image: row.image ?? row.image_link ?? row.image_url,
        url: row.url ?? row.link,
        sku: row.sku,
        id: row.id,
      },
    ];
  });
};

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
      const products = parseCSV(text);

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
