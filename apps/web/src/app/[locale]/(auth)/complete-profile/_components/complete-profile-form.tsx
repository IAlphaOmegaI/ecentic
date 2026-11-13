"use client";

import { ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  type FormEntries,
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useMessages, useTranslations } from "next-intl";
import { useMemo } from "react";
import { z } from "zod";
import { Motion } from "@/components/motion";
import { useRouter } from "@/i18n/navigation";
import {
  profileRoleValues,
  profileSourceValues,
} from "@/lib/auth-profile-options";
import * as User from "@/server/app/user";
import { AuthFeedback, useAuthFeedback } from "../../_components/auth-feedback";

export const CompleteProfileForm = () => {
  const router = useRouter();
  const translate = useTranslations("completeProfile");
  const translateAuth = useTranslations("authUX");
  const feedback = useAuthFeedback();
  const messages = useMessages();

  const roleItems = messages.signUp.roles;
  const sourceItems = messages.signUp.sources;

  const config = useMemo(
    () =>
      ({
        company: field({
          shape: "text",
          validator: z
            .string({ error: translateAuth("validation.company") })
            .trim()
            .min(1, translateAuth("validation.company")),
          label: translate("fields.company.label"),
          placeholder: translate("fields.company.placeholder"),
          classList: { field: "sm:col-span-2" },
        }),
        role: field({
          shape: "select",
          validator: z.literal(profileRoleValues, {
            error: translateAuth("validation.role"),
          }),
          label: translate("fields.role.label"),
          items: roleItems,
          classList: { field: "col-span-1" },
        }),
        source: field({
          shape: "select",
          // @ts-expect-error - source is not typed
          validator: z
            .literal(profileSourceValues, {
              error: translateAuth("validation.source"),
            })
            .optional(),
          label: translate("fields.source.label"),
          items: sourceItems,
          classList: { field: "col-span-1" },
        }),
      }) satisfies GenericForm,
    [roleItems, sourceItems, translate, translateAuth],
  );

  const [handleSubmit, isPending] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      try {
        feedback.clear();
        const result = await User.completeProfile({
          company: data.company,
          jobTitle: data.role,
          source: data.source,
        });

        if (!result.success) {
          feedback.report(result.error, "completeProfile");
          return;
        }

        router.push("/onboarding/connect");
      } catch (error) {
        feedback.report(error, "completeProfile");
      }
    },
  );

  return (
    <Motion.Stagger stagger={0.04}>
      <AuthFeedback error={feedback.error} />
      <Motion.Item>
        <InferredForm
          config={config}
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-x-4 gap-y-4 space-y-0 sm:grid-cols-2"
        >
          <Button
            type="submit"
            color="primary"
            disabled={isPending}
            className="mt-1 flex w-full sm:col-span-2"
          >
            {isPending
              ? translate("states.saving")
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
