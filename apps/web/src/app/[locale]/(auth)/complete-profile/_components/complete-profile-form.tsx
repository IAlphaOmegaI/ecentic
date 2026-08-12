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
import { useToastManager } from "@zenncore/web/components/toast";
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

export const CompleteProfileForm = () => {
  const router = useRouter();
  const toast = useToastManager();
  const translate = useTranslations("completeProfile");
  const translateAuthChrome = useTranslations("authChrome");
  const messages = useMessages();

  const roleItems = messages.signUp.roles;
  const sourceItems = messages.signUp.sources;

  const config = useMemo(
    () =>
      ({
        company: field({
          shape: "text",
          validator: z.string().min(1),
          label: translate("fields.company.label"),
          placeholder: translate("fields.company.placeholder"),
          classList: { field: "col-span-2" },
        }),
        role: field({
          shape: "select",
          validator: z.literal(profileRoleValues),
          label: translate("fields.role.label"),
          items: roleItems,
          classList: { field: "col-span-1" },
        }),
        source: field({
          shape: "select",
          // @ts-expect-error - source is not typed
          validator: z.literal(profileSourceValues).optional(),
          label: translate("fields.source.label"),
          items: sourceItems,
          classList: { field: "col-span-1" },
        }),
      }) satisfies GenericForm,
    [roleItems, sourceItems, translate],
  );

  const [handleSubmit, isPending] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      const result = await User.completeProfile({
        company: data.company,
        jobTitle: data.role,
        source: data.source,
      });

      if (!result.success) {
        toast.add({
          title: translateAuthChrome("toast.error.title"),
          description: result.error.message,
          type: "error",
        });
        return;
      }

      router.push("/onboarding/connect");
    },
  );

  return (
    <Motion.Stagger stagger={0.07} delay={0.18}>
      <Motion.Item>
        <InferredForm
          config={config}
          onSubmit={handleSubmit}
          className="grid grid-cols-2 gap-x-3 gap-y-0.5"
        >
          <Button
            type="submit"
            color="primary"
            disabled={isPending}
            className="col-span-2 mt-1 flex w-full"
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
