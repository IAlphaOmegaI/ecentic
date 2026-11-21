"use client";

import {
  AlertCircleIcon,
  BanIcon,
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  FileSearchIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useMessages, useTranslations } from "next-intl";
import type { ReactNode } from "react";

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

export const Notice = ({
  value,
}: {
  value: { error: boolean; text: string } | null;
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
