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
import { z } from "zod";
import { Motion } from "@/components/motion";
import * as Authentication from "@/server/app/authentication";

const config = {
  password: field({
    shape: "text",
    type: "password",
    validator: z.string().min(8),
    label: "New password",
    placeholder: "Min 8 characters",
  }),
  confirmation: field({
    shape: "text",
    type: "password",
    validator: z.string().min(1),
    label: "Confirm new password",
    placeholder: "Re-enter your new password",
  }),
} satisfies GenericForm;

const InvalidLink = ({ children }: { children: string }) => (
  <div className="flex flex-col items-center gap-6 py-8 text-center">
    <XCircleIcon className="size-16 text-error" />
    <div className="flex flex-col gap-2">
      <p className="font-medium text-2xl text-foreground">
        This link no longer works
      </p>
      <p className="font-light text-foreground-dimmed text-lg">{children}</p>
    </div>
    <Button
      color="primary"
      type="button"
      render={<Link href="/forgot-password" />}
    >
      Request a new link <ArrowRightIcon className="size-4" />
    </Button>
  </div>
);

export const ResetPasswordForm = () => {
  const router = useRouter();
  const toast = useToastManager();
  const searchParameters = useSearchParams();

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
          title: "Error",
          description: result.error.message,
          type: "error",
        });

        return;
      }

      toast.add({
        title: "Password updated",
        description: "Sign in with your new password.",
        type: "success",
      });

      router.push("/sign-in");
    },
  );

  if (error)
    return (
      <InvalidLink>
        Reset links expire after an hour and can only be used once. Ask for a
        fresh one and it'll be in your inbox in a moment.
      </InvalidLink>
    );

  if (!token)
    return (
      <InvalidLink>
        This page needs a reset link to work. Open the most recent one from your
        email, or request another.
      </InvalidLink>
    );

  return (
    <Motion.Stagger stagger={0.07} delay={0.18}>
      <Motion.Item>
        <InferredForm
          config={config}
          extend={(schema) =>
            schema.refine((values) => values.password === values.confirmation, {
              path: ["confirmation"],
              error: "Passwords do not match",
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
            {isPending ? "Updating password..." : "Update password"}
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
