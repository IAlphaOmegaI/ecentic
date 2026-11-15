"use client";

import {
  ArrowRightIcon,
  GlobeIcon,
  GlobeSearchIcon,
  LoaderIcon,
  PlusIcon,
  XIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import {
  field,
  InferredForm,
  InferredFormField,
  type InferredProps,
  type RefinedProps,
} from "@zenncore/web/components/inferred-form";
import { Textarea, TextareaInput } from "@zenncore/web/components/textarea";
import { useTranslations } from "next-intl";
import {
  type FocusEventHandler,
  type Ref,
  useEffect,
  useRef,
  useState,
} from "react";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import {
  comparisonOrigin,
  duplicateComparisonIndexes,
} from "@/lib/ucp-comparison";

const COMPETITOR_FIELDS = [
  "competitor1",
  "competitor2",
  "competitor3",
  "competitor4",
  "competitor5",
] as const;
type CompetitorField = (typeof COMPETITOR_FIELDS)[number];
type FormValues = Record<CompetitorField, string> & {
  source: string;
  query: string;
};

export type ComparisonRequest = {
  sourceStoreUrl: string;
  competitorStoreUrls: string[];
  query?: string;
};

export const ComparisonSetup = ({
  initialSourceStore,
  isRunning,
  onRun,
}: {
  initialSourceStore: string;
  isRunning: boolean;
  onRun: (input: ComparisonRequest) => void;
}) => {
  const translate = useTranslations("dashboard.ucpComparison");
  const [competitors, setCompetitors] = useState<CompetitorField[]>([
    "competitor1",
  ]);
  const [values, setValues] = useState<FormValues>({
    source: initialSourceStore,
    query: "",
    competitor1: "",
    competitor2: "",
    competitor3: "",
    competitor4: "",
    competitor5: "",
  });
  const formRef = useRef<UseFormReturn<FormValues> | null>(null);
  const rosterFields = useRef(new Map<CompetitorField, HTMLDivElement>());
  const focusAfterRosterChange = useRef<CompetitorField | null>(null);
  useEffect(() => {
    if (
      focusAfterRosterChange.current &&
      competitors.includes(focusAfterRosterChange.current)
    ) {
      rosterFields.current
        .get(focusAfterRosterChange.current)
        ?.querySelector("input")
        ?.focus();
      focusAfterRosterChange.current = null;
    }
  }, [competitors]);
  const domainMessage = translate("workbench.validation.domain");
  const competitorField = (name: CompetitorField) =>
    field<"text", z.ZodString, InferredProps<"text", z.ZodString>>({
      shape: "text",
      validator: z
        .string({ error: domainMessage })
        .refine(
          (value) =>
            !competitors.includes(name) || comparisonOrigin(value) !== null,
          domainMessage,
        ),
      label: translate("workbench.competitorLabel", {
        number: competitors.indexOf(name) + 1,
      }),
      placeholder: translate("competitors.placeholder", {
        index: String(competitors.indexOf(name) + 1),
      }),
      inputMode: "url",
      disabled: isRunning,
    });
  const config = {
    source: field<"text", z.ZodString, InferredProps<"text", z.ZodString>>({
      shape: "text",
      validator: z
        .string({ error: domainMessage })
        .refine((value) => comparisonOrigin(value) !== null, domainMessage),
      label: translate("sourceStore.label"),
      placeholder: translate("sourceStore.placeholder"),
      inputMode: "url",
      disabled: isRunning,
    }),
    query: field<
      "custom",
      z.ZodString,
      BuyerRequestProps & { Component: typeof BuyerRequest }
    >({
      shape: "custom",
      Component: BuyerRequest,
      validator: z
        .string()
        .max(1000, translate("workbench.validation.request")),
      label: translate("buyerRequest.label"),
      placeholder: translate("buyerRequest.placeholder"),
      pending: isRunning,
      hint: translate("workbench.requestHint"),
      submitLabel: isRunning
        ? translate("action.running")
        : translate("action.primary"),
      status: isRunning
        ? translate("workbench.running")
        : translate("workbench.ready", {
            count: comparisonOrigin(values.source)
              ? competitors.filter((name) => comparisonOrigin(values[name]))
                  .length + 1
              : 0,
          }),
      classList: { label: "sr-only" },
    }),
    competitor1: competitorField("competitor1"),
    competitor2: competitorField("competitor2"),
    competitor3: competitorField("competitor3"),
    competitor4: competitorField("competitor4"),
    competitor5: competitorField("competitor5"),
  };
  const add = () => {
    const next = COMPETITOR_FIELDS.find((name) => !competitors.includes(name));
    if (next) {
      focusAfterRosterChange.current = next;
      setCompetitors((previous) => [...previous, next]);
    }
  };
  const remove = (name: CompetitorField) => {
    if (competitors.length <= 1) return;
    formRef.current?.setValue(name, "");
    formRef.current?.clearErrors(name);
    const remaining = competitors.filter((field) => field !== name);
    const next =
      remaining[Math.min(competitors.indexOf(name), remaining.length - 1)];
    if (next) focusAfterRosterChange.current = next;
    setCompetitors((previous) => previous.filter((field) => field !== name));
  };

  return (
    <InferredForm
      config={config}
      defaultValues={values}
      renderFields={false}
      className="min-w-0 space-y-0"
      onChange={(next, form) => {
        formRef.current = form;
        setValues(next);
      }}
      extend={(schema) =>
        schema.superRefine((data, context) => {
          for (const index of duplicateComparisonIndexes(
            data.source,
            competitors.map((name) => data[name]),
          )) {
            const name = competitors[index];
            if (!name) continue;
            context.addIssue({
              code: "custom",
              path: [name],
              message: translate("workbench.validation.unique"),
            });
          }
        })
      }
      onSubmit={(data) => {
        if (isRunning) return;
        const source = comparisonOrigin(data.source);
        const targets = competitors.flatMap((name) => {
          const origin = comparisonOrigin(data[name]);
          return origin ? [origin] : [];
        });
        if (source && targets.length)
          onRun({
            sourceStoreUrl: source,
            competitorStoreUrls: targets,
            query: data.query.trim() || undefined,
          });
      }}
    >
      <div className="grid lg:grid-cols-5">
        <div className="flex min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 lg:col-span-2">
          <div className="flex items-start gap-4">
            <GlobeIcon
              aria-hidden
              className="mt-1 size-8 shrink-0 text-primary-text"
            />
            <div className="min-w-0">
              <h2 className="font-medium text-foreground-rich text-xl">
                {translate("workbench.sourceTitle")}
              </h2>
              <p className="mt-2 max-w-sm text-foreground-dimmed text-sm">
                {translate("workbench.sourceDescription")}
              </p>
            </div>
          </div>
          <InferredFormField name="source" {...config.source} />
          <p className="text-foreground-dimmed text-sm">
            {translate("workbench.sameRequest")}
          </p>
        </div>
        <div className="min-w-0 border-accent-foreground border-t lg:col-span-3 lg:border-t-0 lg:border-l">
          <div className="flex items-start gap-4 px-4 py-6 sm:px-6">
            <GlobeSearchIcon
              aria-hidden
              className="mt-1 size-8 shrink-0 text-foreground-dimmed"
            />
            <div className="min-w-0 flex-1">
              <h2 className="font-medium text-foreground-rich text-xl">
                {translate("competitors.label")}
              </h2>
              <p className="mt-2 text-foreground-dimmed text-sm">
                {translate("workbench.competitorDescription")}
              </p>
            </div>
            <span className="shrink-0 text-foreground-dimmed text-sm tabular-nums">
              {translate("workbench.slots", { count: competitors.length })}
            </span>
          </div>
          <div className="divide-y divide-accent-foreground border-accent-foreground border-y">
            {competitors.map((name, index) => (
              <div
                key={name}
                className="flex items-start gap-2 px-4 py-4 sm:px-6"
              >
                <div
                  className="min-w-0 flex-1"
                  ref={(element) => {
                    if (element) rosterFields.current.set(name, element);
                    else rosterFields.current.delete(name);
                  }}
                >
                  <InferredFormField name={name} {...config[name]} />
                </div>
                <div className="pt-7">
                  <Button
                    type="button"
                    variant="soft"
                    color="neutral"
                    size="icon"
                    onClick={() => remove(name)}
                    disabled={competitors.length <= 1 || isRunning}
                    aria-label={translate("competitors.removeAriaLabel", {
                      index: String(index + 1),
                    })}
                  >
                    <XIcon aria-hidden className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="soft"
              color="neutral"
              onClick={add}
              disabled={isRunning || competitors.length >= 5}
            >
              <PlusIcon aria-hidden className="size-4" />
              {translate("competitors.add")}
            </Button>
          </div>
        </div>
      </div>
      <div className="border-accent-foreground border-t px-4 py-6 sm:px-6">
        <InferredFormField name="query" {...config.query} />
      </div>
    </InferredForm>
  );
};

const BuyerRequest = ({
  value,
  onValueChange,
  name,
  label,
  placeholder,
  pending,
  hint,
  submitLabel,
  status,
  onBlur,
  ref,
}: BuyerRequestProps) => (
  <Textarea
    value={value}
    onValueChange={onValueChange}
    disabled={pending}
    className="flex-col bg-background group-data-invalid:border-error"
  >
    <TextareaInput
      ref={ref}
      name={name}
      aria-label={label}
      placeholder={placeholder}
      onBlur={onBlur}
      rows={2}
      maxLength={1000}
      className="min-h-20 resize-none px-4 pt-4 pb-2 text-base leading-relaxed"
      onKeyDown={(event) => {
        if (
          event.key !== "Enter" ||
          event.shiftKey ||
          event.nativeEvent.isComposing
        )
          return;
        event.preventDefault();
        if (!pending) event.currentTarget.form?.requestSubmit();
      }}
    />
    <div className="flex items-end justify-between gap-4 px-4 pb-3">
      <div className="min-w-0 space-y-1">
        <p className="text-foreground-dimmed text-xs">{hint}</p>
        <p aria-live="polite" className="text-foreground-dimmed text-xs">
          {status}
        </p>
      </div>
      <Button
        color="primary"
        type="submit"
        size="icon"
        disabled={pending}
        aria-label={submitLabel}
      >
        {pending ? (
          <LoaderIcon
            aria-hidden
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        ) : (
          <ArrowRightIcon aria-hidden className="size-4 -rotate-90" />
        )}
      </Button>
    </div>
  </Textarea>
);

type BuyerRequestProps = RefinedProps<string> & {
  name?: string;
  label?: string;
  placeholder?: string;
  pending: boolean;
  hint: string;
  submitLabel: string;
  status: string;
  onBlur?: FocusEventHandler<HTMLTextAreaElement>;
  ref?: Ref<HTMLTextAreaElement>;
};
