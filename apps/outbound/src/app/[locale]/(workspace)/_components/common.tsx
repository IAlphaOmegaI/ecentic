"use client";

import {
  AlertCircleIcon,
  BanIcon,
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  FileSearchIcon,
  LoaderIcon,
} from "@zenncore/icons";
import { cn, resultify } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import {
  field,
  type GenericField,
} from "@zenncore/web/components/inferred-form";
import { Textarea, TextareaInput } from "@zenncore/web/components/textarea";
import { useMessages, useTranslations } from "next-intl";
import { type ReactNode, useRef, useState } from "react";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";

export const Multiline = ({
  value,
  onValueChange,
  name,
  disabled,
  onBlur,
  label,
}: Textarea.Props & { label?: string }) => (
  <Textarea
    value={value}
    onValueChange={onValueChange}
    name={name}
    disabled={disabled}
    onBlur={onBlur}
  >
    <TextareaInput
      name={name}
      rows={5}
      aria-label={label}
      className="leading-6"
    />
  </Textarea>
);

/** Field labels come from the typed catalog; the domain schema validates the submission. */
export const fields = <Key extends string>(
  keys: readonly Key[],
  labels: Record<Key, string>,
  options?: {
    multiline?: readonly Key[];
    numbers?: readonly Key[];
    booleans?: readonly Key[];
    choices?: Partial<Record<Key, Record<string, string>>>;
    validators?: Partial<Record<Key, z.ZodType>>;
    descriptions?: Partial<Record<Key, string>>;
    errors?: Partial<Record<Key, string>>;
    invalid?: string;
  },
): Record<Key, GenericField> =>
  Object.fromEntries(
    [...new Set(keys)].map((key): [Key, GenericField] => {
      const label = labels[key];
      const choices = options?.choices?.[key];
      const error = options?.errors?.[key] ?? options?.invalid;
      const description = options?.descriptions?.[key];
      const validate = (value: unknown) =>
        options?.validators?.[key]?.safeParse(value).success ?? true;
      if (choices) {
        const validator: z.ZodEnum<Record<string, string>> = z
          .enum(Object.keys(choices), { error })
          .refine(validate, { error });
        return [
          key,
          field({
            shape: "select",
            validator,
            label,
            description,
            items: Object.entries(choices).map(([value, label]) => ({
              value,
              label,
            })),
          }),
        ];
      }
      if (options?.booleans?.includes(key)) {
        const validator: z.ZodBoolean = z
          .boolean({ error })
          .refine(validate, { error });
        return [
          key,
          field({
            shape: "checkbox",
            validator,
            label,
            description,
            classList: {
              field:
                "rounded-lg border border-accent-foreground bg-background/60 p-3 sm:col-span-2",
            },
          }),
        ];
      }
      if (options?.numbers?.includes(key)) {
        const validator: z.ZodNumber = z
          .number({ error })
          .refine(validate, { error });
        return [
          key,
          field({
            shape: "number",
            validator,
            label,
            description,
          }),
        ];
      }
      const validator: z.ZodString = z
        .string({ error })
        .refine(validate, { error });
      if (options?.multiline?.includes(key))
        return [
          key,
          field({
            shape: "custom",
            Component: Multiline,
            validator,
            label,
            description,
            classList: { field: "sm:col-span-2" },
          }),
        ];
      return [
        key,
        field({
          shape: "text",
          type: key === "email" || key === "fromEmail" ? "email" : "text",
          validator,
          label,
          description,
        }),
      ];
    }),
  ) as Record<Key, GenericField>;

export const useMutation = () => {
  const router = useRouter();
  const t = useTranslations("outbound.common");
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(
    null,
  );
  const run = async <Value,>(
    operation: () => Promise<{
      success: boolean;
      data?: Value;
      error?: unknown;
    }>,
    onSuccess?: (value: Value | undefined) => void | Promise<void>,
  ) => {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setNotice(null);
    const result = await resultify(operation);
    if (!result.success || !result.data?.success) {
      const error = result.success ? result.data?.error : result.error;
      const message = z
        .object({ message: z.string().trim().min(1).max(2000) })
        .safeParse(error);
      setNotice({
        error: true,
        text:
          error instanceof z.ZodError
            ? t("invalidForm")
            : message.success
              ? message.data.message
              : t("requestError"),
      });
      running.current = false;
      setPending(false);
      return;
    }
    const completion = await resultify(async () => {
      await onSuccess?.(result.data.data);
      router.refresh();
    });
    setNotice({
      error: !completion.success,
      text: completion.success ? t("saved") : t("savedRefreshError"),
    });
    running.current = false;
    setPending(false);
  };
  return { pending, notice, run };
};

export const Notice = ({
  value,
}: {
  value: ReturnType<typeof useMutation>["notice"];
}) =>
  value && (
    <p
      role={value.error ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 text-sm leading-5",
        value.error ? "text-error" : "text-success",
      )}
    >
      {value.error ? (
        <AlertCircleIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
      ) : (
        <CheckCircleIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
      )}
      {value.text}
    </p>
  );

export const Submit = ({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) => (
  <Button type="submit" disabled={pending}>
    {pending && (
      <LoaderIcon
        aria-hidden
        className="size-4 animate-spin motion-reduce:animate-none"
      />
    )}
    {children}
  </Button>
);

export const Empty = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) => (
  <div className="flex min-h-72 flex-col items-center justify-center gap-4 px-4 py-12 text-center sm:px-6">
    <div
      aria-hidden
      className="flex size-12 items-center justify-center rounded-lg border border-accent-foreground bg-background text-foreground-dimmed"
    >
      <FileSearchIcon className="size-6" />
    </div>
    <h2 className="font-semibold text-foreground-rich text-lg">{title}</h2>
    <p className="max-w-md text-foreground-dimmed text-sm leading-6">
      {description}
    </p>
    {children}
  </div>
);

export const Status = ({ value }: { value: string }) => {
  const t = useTranslations("outbound.status");
  const messages = useMessages();
  const labels = messages.outbound.status;
  const appearance = (() => {
    switch (true) {
      case ["approved", "verified", "completed", "finished"].includes(value):
        return {
          icon: CheckCircleIcon,
          className: "bg-success/10 text-success",
        };
      case ["suppressed", "optedOut", "bounced", "invalid"].includes(value):
        return { icon: BanIcon, className: "bg-error/10 text-error" };
      case ["held", "hold", "stale", "unverified"].includes(value):
        return {
          icon: AlertCircleIcon,
          className: "bg-warning/10 text-warning-foreground",
        };
      case ["active", "sent", "replied"].includes(value):
        return {
          icon: EnvelopeIcon,
          className: "bg-primary/8 text-primary-text",
        };
      default:
        return {
          icon: ClockIcon,
          className: "bg-background-dimmed text-foreground-dimmed",
        };
    }
  })();
  const Icon = appearance.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-2 py-1 font-medium text-xs",
        appearance.className,
      )}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {Object.entries(labels).find(([key]) => key === value)?.[1] ??
        t("unknown")}
    </span>
  );
};
