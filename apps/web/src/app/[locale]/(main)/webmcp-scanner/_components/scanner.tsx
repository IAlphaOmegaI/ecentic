"use client";

import { ArrowRightIcon, SearchIcon } from "@zenncore/icons";
import { cn, resultify } from "@zenncore/utils";
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
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import type { Outcome } from "@/lib/webmcp";
import * as WebMcp from "@/server/app/webmcp";
import { ScanReport } from "./report";

export const Scanner = ({
  initialUrl = "",
  store,
  appearance = "default",
}: Scanner.Props) => {
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
    <div
      data-scanner-appearance={appearance}
      className={cn(appearance === "default" && "bg-background-rich")}
    >
      <div
        className={cn(
          "grid gap-8 px-7 py-12 max-sm:px-4 max-sm:py-8 lg:grid-cols-[1fr_2fr]",
          appearance === "workbench" &&
            "relative items-center gap-0 p-0! lg:grid-cols-2",
        )}
      >
        {appearance === "workbench" ? (
          <div className="relative min-w-0 border-background-rich/15 border-r px-8 py-8 max-sm:px-4 max-lg:border-r-0 max-lg:border-b">
            <CommerceFigure
              kind="inspection"
              surface="dark"
              className="mx-auto aspect-[5/3] w-full max-w-[390px]"
            />
            <h2 className="mt-3 font-medium text-3xl! text-background-rich">
              {translate("title")}
            </h2>
            <p className="mt-4 max-w-[45ch] text-background-rich/70 text-base leading-relaxed">
              {translate("description")}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <SearchIcon className="size-4 text-primary" />
            <h2 className="font-medium text-2xl text-foreground">
              {translate("title")}
            </h2>
            <p className="text-foreground-dimmed text-sm leading-relaxed">
              {translate("description")}
            </p>
          </div>
        )}
        <div
          className={cn(
            "space-y-4",
            appearance === "workbench" &&
              "h-full content-center bg-linear-to-br from-primary/15 to-transparent px-8 py-10 max-sm:px-4 [&_form_.text-foreground-dimmed]:text-background-rich/70 [&_form_div:has(>input)]:h-12 [&_form_div:has(>input)]:bg-background-rich [&_form_div:has(>input)]:px-3 [&_label]:text-background-rich",
          )}
        >
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
          <p
            className={cn(
              "text-foreground-dimmed text-xs leading-relaxed",
              appearance === "workbench" && "text-background-rich/65",
            )}
          >
            {translate("scope")}
          </p>
          <div aria-live="polite" aria-atomic="true">
            {pending && (
              <p
                className={cn(
                  "text-primary-text text-sm",
                  appearance === "workbench" && "text-primary-rich",
                )}
              >
                {translate("progress")}
              </p>
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
      {outcome?.kind === "complete" &&
        (appearance === "workbench" ? (
          <div
            data-nav-tone="light"
            className="bg-background-rich text-foreground [&_:is(h2,h3,h4)]:text-foreground-rich!"
          >
            <ScanReport key={run} report={outcome.report} />
          </div>
        ) : (
          <ScanReport key={run} report={outcome.report} />
        ))}
      <div
        className={cn(
          "flex flex-wrap gap-x-6 gap-y-2 border-accent-foreground border-t px-7 py-4 text-xs max-sm:px-4",
          appearance === "workbench" &&
            "border-background-rich/15 [&_a]:text-primary-rich",
        )}
      >
        <span
          className={cn(
            "text-foreground-dimmed",
            appearance === "workbench" && "text-background-rich/65",
          )}
        >
          {translate("sources.label")}
        </span>
        <a
          href="https://webmachinelearning.github.io/webmcp/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-text underline underline-offset-4"
        >
          {translate("sources.specification")}
        </a>
        <a
          href="https://developer.chrome.com/docs/ai/webmcp"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-text underline underline-offset-4"
        >
          {translate("sources.chrome")}
        </a>
      </div>
    </div>
  );
};

export namespace Scanner {
  export type Props = {
    initialUrl?: string;
    store?: string;
    appearance?: "default" | "workbench";
  };
}
