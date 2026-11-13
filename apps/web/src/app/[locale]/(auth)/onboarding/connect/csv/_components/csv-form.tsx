"use client";

import {
  ArrowRightIcon,
  FileIcon,
  LoaderIcon,
  UploadIcon,
} from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
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
import { useOnboardingError } from "@/app/[locale]/(auth)/onboarding/_components/use-onboarding-error";
import { useRouter } from "@/i18n/navigation";
import { parseCsvProducts } from "@/lib/csv";
import { callOnboardingAction } from "@/lib/onboarding-errors";
import * as CsvIntegration from "@/server/app/integration/csv";

export const CsvForm = () => {
  const router = useRouter();
  const toast = useToastManager();
  const formatError = useOnboardingError();
  const translate = useTranslations("onboarding.connect");
  const experience = useTranslations("onboarding.experience");
  const recovery = useTranslations("onboardingRecovery.upload");

  const config = useMemo(
    () =>
      ({
        file: field({
          shape: "file",
          mode: "single",
          accept: [".csv"],
          label: translate("csv.fields.file.label"),
          description: translate("csv.fields.file.description"),
          validator: z.file({ error: experience("fileRequired") }),
          inputLabel: recovery("choose"),
          emptyContent: (
            <span className="relative z-10 flex w-full min-w-0 flex-col items-start gap-6">
              <span className="flex w-full items-center justify-between gap-4">
                <FileIcon className="size-10 text-primary-rich" aria-hidden />
                <span className="rounded-md border border-background-rich/20 px-2 py-1 text-background-rich/80 text-xs">
                  CSV
                </span>
              </span>
              <span className="flex min-w-0 flex-col gap-2">
                <span className="font-heading font-medium text-background-rich text-xl">
                  {recovery("choose")}
                </span>
                <span className="text-background-rich/75 text-sm leading-relaxed">
                  {recovery("drop")}
                </span>
              </span>
              <span className="flex items-center gap-2 font-medium text-background-rich text-sm">
                <UploadIcon className="size-4" aria-hidden />
                {recovery("browse")}
              </span>
            </span>
          ),
          selectedContent: (file: File) => (
            <span className="relative z-10 flex w-full min-w-0 flex-col items-start gap-6">
              <FileIcon className="size-10 text-primary-rich" aria-hidden />
              <span className="flex min-w-0 flex-col gap-2">
                <span className="font-medium text-background-rich/75 text-sm">
                  {recovery("selected")}
                </span>
                <span className="w-full break-all font-heading font-medium text-background-rich text-xl">
                  {file.name}
                </span>
              </span>
              <span className="flex items-center gap-2 font-medium text-background-rich text-sm">
                <UploadIcon className="size-4" aria-hidden />
                {recovery("replace")}
              </span>
            </span>
          ),
          classList: {
            control: {
              root: "min-w-0 border-0 p-0",
              input:
                "flex h-auto min-h-64 min-w-0 overflow-hidden rounded-xl border-0 bg-linear-to-br from-emphasis-dimmed via-emphasis to-primary-text/90 p-6 text-left data-dragging:ring-2 data-dragging:ring-primary-rich data-dragging:ring-inset focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4 sm:p-8",
            },
          },
        }),
      }) satisfies GenericForm,
    [translate, experience, recovery],
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

      const contents = await resultify(() => file.text());
      if (!contents.success) {
        toast.add({
          title: translate("csv.toast.importFailed"),
          description: formatError(contents.error),
          type: "error",
        });
        return;
      }
      const products = parseCsvProducts(contents.data);

      if (products.length === 0) {
        toast.add({
          title: translate("csv.toast.noProducts.title"),
          description: translate("csv.toast.noProducts.description"),
          type: "error",
        });
        return;
      }

      const result = await callOnboardingAction(() =>
        CsvIntegration.connect({
          products,
          filename: file.name,
        }),
      );

      if (!result.success) {
        toast.add({
          title: translate("csv.toast.importFailed"),
          description: formatError(result.error),
          type: "error",
        });
        return;
      }

      const sync = await callOnboardingAction(() =>
        CsvIntegration.syncProducts({
          store: result.data.id,
          products,
        }),
      );

      if (!sync.success) {
        toast.add({
          title: translate("csv.toast.importFailed"),
          description: formatError(sync.error),
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
