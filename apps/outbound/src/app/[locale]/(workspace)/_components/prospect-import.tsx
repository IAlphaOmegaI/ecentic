"use client";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import * as Outbound from "@/server/app/outbound";
import { Multiline, Notice, Submit, useMutation } from "./common";

export const ImportForm = () => {
  const t = useTranslations("outbound");
  const mutation = useMutation();
  const [summary, setSummary] = useState<
    | Extract<
        Awaited<ReturnType<typeof Outbound.importProspects>>,
        { success: true }
      >["data"]
    | null
  >(null);
  return (
    <div className="p-6">
      <InferredForm
        config={{
          content: field({
            shape: "custom",
            Component: Multiline,
            validator: z
              .string({ error: t("common.required") })
              .trim()
              .min(1, { error: t("common.required") })
              .max(2_000_000, { error: t("import.help") }),
            label: t("import.fields.content"),
            description: t("import.help"),
          }),
        }}
        defaultValues={{ content: "" }}
        onSubmit={({ content }) => {
          setSummary(null);
          return mutation.run(
            () => Outbound.importProspects({ content }),
            (saved) => setSummary(saved ?? null),
          );
        }}
        className="space-y-5"
      >
        <Submit pending={mutation.pending}>{t("import.action.primary")}</Submit>
        <Notice value={summary ? null : mutation.notice} />
        {summary && (
          <div className="space-y-4" role="status">
            <p className="text-foreground-dimmed text-sm">
              {t("import.summary", {
                imported: summary.imported,
                duplicate: summary.duplicate,
                suppressed: summary.suppressed,
                invalid: summary.invalid,
              })}
            </p>
            {summary.errors.length > 0 && (
              <ul className="list-disc space-y-2 pl-4 text-error text-sm">
                {summary.errors.map(({ row }) => (
                  <li key={row}>{t("import.rowError", { row })}</li>
                ))}
              </ul>
            )}
            {summary.invalid > summary.errors.length && (
              <p className="text-error text-sm">
                {t("import.moreErrors", {
                  count: summary.invalid - summary.errors.length,
                })}
              </p>
            )}
          </div>
        )}
      </InferredForm>
    </div>
  );
};
