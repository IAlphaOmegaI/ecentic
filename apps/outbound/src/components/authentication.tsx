"use client";

import { ArrowRightIcon, EnvelopeIcon, LoaderIcon } from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";
import { client } from "@/lib/auth-client";
import { SignOutButton } from "./account-control";

export const SignInForm = () => {
  const translate = useTranslations("outbound.auth");
  const router = useRouter();
  const running = useRef(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticate, pending] = useAsyncAction(
    async (credentials: SignInForm.Credentials) => {
      setError(null);
      const authentication = await resultify(() =>
        client.signIn.email(credentials),
      );
      if (!authentication.success || authentication.data.error) {
        setError(
          authentication.success && authentication.data.error?.status === 403
            ? translate("accessNote")
            : translate("error"),
        );
        running.current = false;
        return;
      }
      setComplete(true);
      router.replace("/");
      router.refresh();
    },
    false,
  );
  const submit = (credentials: SignInForm.Credentials) => {
    if (running.current) return;
    running.current = true;
    return authenticate(credentials);
  };
  const disabled = pending || complete;
  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="text-error text-sm leading-relaxed">
          {error}
        </p>
      )}
      <InferredForm
        config={{
          email: field({
            shape: "text",
            type: "email",
            autoComplete: "username",
            inputMode: "email",
            disabled,
            leadingContent: (
              <EnvelopeIcon
                aria-hidden
                className="size-4 text-foreground-dimmed"
              />
            ),
            validator: z.string().trim().email(translate("validation.email")),
            label: translate("fields.email"),
          }),
          password: field({
            shape: "text",
            type: "password",
            autoComplete: "current-password",
            disabled,
            maskToggleLabels: {
              show: translate("password.show"),
              hide: translate("password.hide"),
            },
            validator: z.string().min(1, translate("validation.password")),
            label: translate("fields.password"),
          }),
        }}
        defaultValues={{ email: "", password: "" }}
        onSubmit={submit}
        className="flex flex-col gap-4"
        aria-busy={disabled}
      >
        <Button type="submit" disabled={disabled} width="full">
          {disabled ? <LoaderIcon aria-hidden /> : null}
          {disabled ? translate("pending") : translate("action.primary")}
          {!disabled && <ArrowRightIcon aria-hidden />}
        </Button>
      </InferredForm>
    </div>
  );
};
export namespace SignInForm {
  export type Credentials = { email: string; password: string };
}

export const AccessDenied = () => {
  const translate = useTranslations("outbound.auth.denied");
  return (
    <div className="space-y-4" role="alert">
      <h2 className="font-semibold text-foreground-rich text-xl">
        {translate("title")}
      </h2>
      <p className="text-foreground-dimmed text-sm leading-6">
        {translate("description")}
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
    className="animate-pulse space-y-4 motion-reduce:animate-none"
  >
    {["email", "password"].map((field) => (
      <div key={field} className="space-y-2">
        <div className="h-4 w-24 rounded-sm bg-accent-foreground/40" />
        <div className="h-10 rounded-sm bg-accent-foreground/30" />
      </div>
    ))}
    <div className="h-10 rounded-lg bg-accent-foreground/30" />
  </div>
);
