"use client";

import { ArrowRightIcon, LoaderIcon, XCircleIcon } from "@zenncore/icons";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  type FormEntries,
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useToastManager } from "@zenncore/web/components/toast";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { z } from "zod";
import { Motion } from "@/components/motion";
import * as Authentication from "@/server/app/authentication";

const InvalidLink = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: string;
}) => (
  <div className="flex flex-col items-center gap-6 py-8 text-center">
    <XCircleIcon className="size-16 text-error" />
    <div className="flex flex-col gap-2">
      <p className="font-medium text-2xl text-foreground">{title}</p>
      <p className="font-light text-foreground-dimmed text-lg">{description}</p>
    </div>
    <Button
      color="primary"
      type="button"
      render={<Link href="/forgot-password" />}
    >
      {action} <ArrowRightIcon className="size-4" />
    </Button>
  </div>
);

export const ResetPasswordForm = () => {
  const router = useRouter();
  const toast = useToastManager();
  const searchParameters = useSearchParams();
  const translate = useTranslations("resetPassword");
  const translateAuthChrome = useTranslations("authChrome");

  const config = useMemo(
    () =>
      ({
        password: field({
          shape: "text",
          type: "password",
          validator: z.string().min(8),
          label: translate("fields.password.label"),
          placeholder: translate("fields.password.placeholder"),
        }),
        confirmation: field({
          shape: "text",
          type: "password",
          validator: z.string().min(1),
          label: translate("fields.confirmation.label"),
          placeholder: translate("fields.confirmation.placeholder"),
        }),
      }) satisfies GenericForm,
    [translate],
  );

  // Better Auth's `/reset-password/:token` endpoint checks the token before it
  // ever reaches this page, then forwards it here — or replaces it with
  // `?error=` when it has expired or was already spent.
  const token = searchParameters.get("token");
  const error = searchParameters.get("error");

  const [handleSubmit, isPending] = useAsyncAction(
    async ({ password }: FormEntries<typeof config>) => {
      if (!token) return;

      const result = await Authentication.resetPassword({ token, password });

      if (!result.success) {
        toast.add({
          title: translateAuthChrome("toast.error.title"),
          description: result.error.message,
          type: "error",
        });

        return;
      }

      toast.add({
        title: translate("toast.success.title"),
        description: translate("toast.success.description"),
        type: "success",
      });

      router.push("/sign-in");
    },
  );

  if (error)
    return (
      <InvalidLink
        title={translate("states.invalidLink.title")}
        description={translate("states.invalidLink.expired")}
        action={translate("action.secondary")}
      />
    );

  if (!token)
    return (
      <InvalidLink
        title={translate("states.invalidLink.title")}
        description={translate("states.invalidLink.missing")}
        action={translate("action.secondary")}
      />
    );

  return (
    <Motion.Stagger stagger={0.07} delay={0.18}>
      <Motion.Item>
        <InferredForm
          config={config}
          extend={(schema) =>
            schema.refine((values) => values.password === values.confirmation, {
              path: ["confirmation"],
              error: translate("validation.passwordsMismatch"),
            })
          }
          onSubmit={handleSubmit}
          className="flex flex-col gap-3"
        >
          <Button
            type="submit"
            color="primary"
            disabled={isPending}
            className="mt-1 flex w-full"
          >
            {isPending
              ? translate("states.updating")
              : translate("action.primary")}
            {isPending ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <ArrowRightIcon className="size-4" />
            )}
          </Button>
        </InferredForm>
      </Motion.Item>
    </Motion.Stagger>
  );
};
