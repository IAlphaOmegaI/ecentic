"use client";

import {
  ArrowRightIcon,
  EnvelopeIcon,
  LoaderIcon,
  ShieldCheckIcon,
} from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";
import { client } from "@/lib/auth-client";
import { SignOutButton } from "./account-control";

export const SignInForm = () => {
  const t = useTranslations("outbound.auth");
  const router = useRouter();
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <InferredForm
      config={{
        email: field({
          shape: "text",
          type: "email",
          autoComplete: "username",
          inputMode: "email",
          disabled: pending,
          leadingContent: (
            <EnvelopeIcon
              aria-hidden
              className="size-4 text-foreground-dimmed"
            />
          ),
          validator: z.string().trim().email(t("validation.email")),
          label: t("fields.email"),
        }),
        password: field({
          shape: "text",
          type: "password",
          autoComplete: "current-password",
          disabled: pending,
          maskToggleLabels: {
            show: t("password.show"),
            hide: t("password.hide"),
          },
          validator: z.string().min(1, t("validation.password")),
          label: t("fields.password"),
        }),
      }}
      defaultValues={{ email: "", password: "" }}
      onSubmit={async (values) => {
        if (running.current) return;
        running.current = true;
        setPending(true);
        setError(null);
        const result = await resultify(() => client.signIn.email(values));
        if (!result.success || result.data.error) {
          setError(
            result.success && result.data.error?.status === 403
              ? t("accessNote")
              : t("error"),
          );
          running.current = false;
          setPending(false);
          return;
        }
        router.replace("/");
        router.refresh();
      }}
      className="space-y-5"
      aria-busy={pending}
    >
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-error/20 bg-error/5 px-3 py-2.5 text-error text-sm leading-relaxed"
        >
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending && (
          <LoaderIcon
            aria-hidden
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        )}
        {pending ? t("pending") : t("action.primary")}
        {!pending && <ArrowRightIcon aria-hidden className="size-4" />}
      </Button>
      <p className="flex items-start gap-2 border-accent-foreground border-t pt-5 text-foreground-dimmed text-sm leading-6">
        <ShieldCheckIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
        {t("accessNote")}
      </p>
    </InferredForm>
  );
};

export const AccessDenied = () => {
  const t = useTranslations("outbound.auth.denied");
  return (
    <div className="space-y-5" role="alert">
      <h2 className="font-semibold text-foreground-rich text-xl">
        {t("title")}
      </h2>
      <p className="text-foreground-dimmed text-sm leading-6">
        {t("description")}
      </p>
      <div className="flex">
        <SignOutButton />
      </div>
    </div>
  );
};

export const SignInSkeleton = () => (
  <div
    aria-hidden
    className="animate-pulse space-y-5 motion-reduce:animate-none"
  >
    {["email", "password"].map((field) => (
      <div key={field} className="space-y-2">
        <div className="h-4 w-24 rounded-sm bg-accent-foreground/40" />
        <div className="h-10 rounded-sm bg-accent-foreground/30" />
      </div>
    ))}
    <div className="h-10 rounded-lg bg-accent-foreground/30" />
    <div className="h-4 w-4/5 rounded-sm bg-accent-foreground/30" />
  </div>
);
