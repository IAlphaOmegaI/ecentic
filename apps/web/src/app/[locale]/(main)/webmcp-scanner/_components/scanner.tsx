"use client";

import { ArrowRightIcon, SearchIcon } from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  type FormEntries,
  field,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { z } from "zod";
import type { Outcome } from "@/lib/webmcp";
import * as WebMcp from "@/server/app/webmcp";
import { ScanReport } from "./report";

export const Scanner = ({ initialUrl = "", store }: Scanner.Props) => {
  const translate = useTranslations("webmcpScanner.form");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [failed, setFailed] = useState(false);
  const [run, setRun] = useState(0);
  const config = useMemo(
    () => ({
      url: field({
        shape: "text",
        validator: z
          .string()
          .trim()
          .min(1, translate("fields.url.required"))
          .max(2048, translate("fields.url.invalid")),
        label: translate("fields.url.label"),
        placeholder: translate("fields.url.placeholder"),
        description: translate(
          store ? "fields.url.storeDescription" : "fields.url.description",
        ),
      }),
    }),
    [store, translate],
  );

  const [submit, pending] = useAsyncAction(
    async ({ url }: FormEntries<typeof config>) => {
      setOutcome(null);
      setFailed(false);
      const response = await resultify(() =>
        store ? WebMcp.scanStore({ store, url }) : WebMcp.scan({ url }),
      );
      if (!response.success || !response.data.success) {
        setFailed(true);
        return;
      }
      setOutcome(response.data.data);
      setRun((previous) => previous + 1);
    },
  );

  return (
    <div className="bg-background-rich">
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-4">
          <SearchIcon className="size-4 text-primary" />
          <h2 className="font-medium text-2xl text-foreground">
            {translate("title")}
          </h2>
          <p className="text-foreground-dimmed text-sm leading-relaxed">
            {translate("description")}
          </p>
        </div>
        <div className="space-y-4">
          <InferredForm
            config={config}
            defaultValues={{ url: initialUrl }}
            onSubmit={submit}
            className="flex flex-col gap-4"
          >
            <div className="flex">
              <Button type="submit" color="primary" disabled={pending}>
                {pending ? translate("pending") : translate("action.primary")}
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          </InferredForm>
          <p className="text-foreground-dimmed text-xs leading-relaxed">
            {translate("scope")}
          </p>
          <div aria-live="polite" aria-atomic="true">
            {pending && (
              <p className="text-primary text-sm">{translate("progress")}</p>
            )}
            {failed && (
              <p role="alert" className="text-error text-sm">
                {translate("errors.failed")}
              </p>
            )}
            {outcome && outcome.kind !== "complete" && (
              <p role="alert" className="text-error text-sm">
                {translate(`errors.${outcome.kind}`)}
                {outcome.kind === "limited" && outcome.retryAfter
                  ? ` ${translate("errors.retryAfter", { seconds: outcome.retryAfter })}`
                  : ""}
              </p>
            )}
            {outcome?.kind === "complete" && (
              <p className="sr-only">{translate("complete")}</p>
            )}
          </div>
        </div>
      </div>
      {outcome?.kind === "complete" && (
        <ScanReport key={run} report={outcome.report} />
      )}
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-accent-foreground border-t px-6 py-4 text-xs sm:px-8">
        <span className="text-foreground-dimmed">
          {translate("sources.label")}
        </span>
        <a
          href="https://webmachinelearning.github.io/webmcp/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-4"
        >
          {translate("sources.specification")}
        </a>
        <a
          href="https://developer.chrome.com/docs/ai/webmcp"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-4"
        >
          {translate("sources.chrome")}
        </a>
      </div>
    </div>
  );
};

export namespace Scanner {
  export type Props = { initialUrl?: string; store?: string };
}
