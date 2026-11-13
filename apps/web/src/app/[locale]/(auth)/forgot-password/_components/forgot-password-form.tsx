"use client";

import { ArrowRightIcon, CheckCircleIcon, LoaderIcon } from "@zenncore/icons";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  type FormEntries,
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Motion } from "@/components/motion";
import * as Authentication from "@/server/app/authentication";
import { AuthFeedback, useAuthFeedback } from "../../_components/auth-feedback";

export const ForgotPasswordForm = () => {
  const locale = useLocale();
  const translate = useTranslations("forgotPassword");
  const translateAuth = useTranslations("authUX");
  const feedback = useAuthFeedback();
  // Holds the address the link went to, and doubles as the "sent" flag.
  const [recipient, setRecipient] = useState<string | null>(null);

  const config = useMemo(
    () =>
      ({
        email: field({
          shape: "text",
          type: "email",
          validator: z
            .string({ error: translateAuth("validation.email") })
            .trim()
            .email(translateAuth("validation.email")),
          label: translate("fields.email.label"),
          placeholder: translate("fields.email.placeholder"),
          description: translate("fields.email.description"),
        }),
      }) satisfies GenericForm,
    [translate, translateAuth],
  );

  const [handleSubmit, isPending] = useAsyncAction(
    async ({ email }: FormEntries<typeof config>) => {
      try {
        feedback.clear();
        const result = await Authentication.forgotPassword({ email, locale });

        if (!result.success) {
          feedback.report(result.error, "forgotPassword");

          return;
        }

        // Deliberately unconditional: the action succeeds for an address that
        // has no account too, and saying so here would leak who has one.
        setRecipient(email);
      } catch (error) {
        feedback.report(error, "forgotPassword");
      }
    },
  );

  return (
    <>
      {recipient ? (
        <div className="flex flex-col items-center gap-6 py-8 text-center">
          <CheckCircleIcon className="size-16 text-primary" />
          <div className="flex flex-col gap-2">
            <p className="font-medium text-2xl text-foreground">
              {translate("states.sent.title")}
            </p>
            <p className="font-light text-foreground-dimmed text-lg">
              {translate.rich("states.sent.description", {
                email: recipient,
                highlight: (chunks) => (
                  <span className="text-foreground">{chunks}</span>
                ),
              })}
            </p>
          </div>
          <Button
            variant="soft"
            color="emphasis"
            type="button"
            onClick={() => setRecipient(null)}
          >
            {translate("action.tertiary")}
          </Button>
        </div>
      ) : (
        <div>
          <Motion.Stagger stagger={0.04}>
            <AuthFeedback error={feedback.error} />
            <Motion.Item>
              <InferredForm
                config={config}
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
                    ? translate("states.sending")
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
        </div>
      )}
    </>
  );
};
