"use client";

import { ArrowRightIcon, LoaderIcon, LogOutIcon } from "@zenncore/icons";
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
import { LanguageSwitcher } from "@/components/language-switcher";
import { useRouter } from "@/i18n/navigation";
import * as Authentication from "@/server/app/authentication";
import * as User from "@/server/app/user";

const labelClassName = "font-medium text-sm text-foreground";

export const AccountSection = ({ user }: { user: User.Type }) => {
  const router = useRouter();
  const toast = useToastManager();
  const translate = useTranslations("dashboard.settings.account");
  const messages = useMessages();

  const profile = useMemo(
    () =>
      ({
        name: field({
          shape: "text",
          validator: z
            .string()
            .min(1, translate("profile.fields.name.validation")),
          label: translate("profile.fields.name.label"),
          classList: { field: "col-span-1", label: labelClassName },
        }),
        surname: field({
          shape: "text",
          validator: z
            .string()
            .min(1, translate("profile.fields.surname.validation")),
          label: translate("profile.fields.surname.label"),
          classList: { field: "col-span-1", label: labelClassName },
        }),
        email: field({
          shape: "text",
          validator: z
            .string()
            .email(translate("profile.fields.email.validation")),
          label: translate("profile.fields.email.label"),
          classList: { field: "col-span-2", label: labelClassName },
        }),
        role: field({
          shape: "select",
          validator: z.literal(
            messages.dashboard.settings.account.profile.roles,
          ),
          label: translate("profile.fields.role.label"),
          classList: { field: "col-span-2", label: labelClassName },
        }),
      }) satisfies GenericForm,
    [messages, translate],
  );

  const password = useMemo(
    () =>
      ({
        currentPassword: field({
          shape: "text",
          type: "password",
          validator: z
            .string()
            .min(1, translate("password.fields.current.validation")),
          label: translate("password.fields.current.label"),
          classList: { label: labelClassName },
        }),
        newPassword: field({
          shape: "text",
          type: "password",
          validator: z
            .string()
            .min(8, translate("password.fields.new.validation")),
          label: translate("password.fields.new.label"),
          classList: { label: labelClassName },
        }),
        confirmPassword: field({
          shape: "text",
          type: "password",
          validator: z
            .string()
            .min(8, translate("password.fields.confirm.validation")),
          label: translate("password.fields.confirm.label"),
          classList: { label: labelClassName },
        }),
      }) satisfies GenericForm,
    [translate],
  );

  const [handleProfileSubmit, isProfilePending] = useAsyncAction(
    async (data: FormEntries<typeof profile>) => {
      const result = await User.updateProfile(data);

      if (!result.success) {
        toast.add({
          title: translate("toast.error"),
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({ title: translate("toast.profileSaved"), type: "success" });
    },
  );

  const [handlePasswordSubmit, isPasswordPending] = useAsyncAction(
    async (data: FormEntries<typeof password>) => {
      if (data.newPassword !== data.confirmPassword) {
        toast.add({
          title: translate("password.toast.mismatch"),
          type: "error",
        });
        return;
      }
      const result = await Authentication.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      if (!result.success) {
        toast.add({
          title: translate("toast.error"),
          description: result.error.message,
          type: "error",
        });
        return;
      }
      toast.add({ title: translate("toast.passwordUpdated"), type: "success" });
    },
  );

  const [handleSignOut, isSignOutPending] = useAsyncAction(async () => {
    // On success the action redirects to /sign-in server-side and never returns
    // a result, so only a failure lands here.
    const result = await Authentication.signOut();

    if (result && !result.success) {
      toast.add({
        title: translate("toast.signOutFailed"),
        description: result.error.message,
        type: "error",
      });
      return;
    }

    router.refresh();
  });

  return (
    <div className="divide-y divide-accent-foreground">
      <div className="px-8">
        <div className="flex items-center justify-between border-accent-foreground border-x p-4">
          <div>
            <h3 className="font-semibold text-base text-foreground-rich">
              {translate("language.title")}
            </h3>
            <p className="mt-1 text-foreground-dimmed text-sm">
              {translate("language.description")}
            </p>
          </div>
          <LanguageSwitcher variant="inline" />
        </div>
      </div>

      <div className="px-8">
        <div className="border-accent-foreground border-x p-4">
          <h3 className="font-semibold text-base text-foreground-rich">
            {translate("profile.title")}
          </h3>
          <p className="mt-1 text-foreground-dimmed text-sm">
            {translate("profile.description")}
          </p>
        </div>
        <div className="-mx-8 border-accent-foreground border-t px-8">
          <InferredForm
            config={profile}
            defaultValues={{
              name: user.name,
              surname: user.surname,
              email: user.email,
              // @ts-expect-error - user.role is not typed
              role:
                user.role ??
                messages.dashboard.settings.account.profile.roles[0],
            }}
            onSubmit={handleProfileSubmit}
            className="grid grid-cols-2 gap-4 border-accent-foreground border-x p-4"
          >
            <div className="col-span-2 -mx-12 border-accent-foreground border-t px-8">
              <div className="flex justify-end p-4 pb-0">
                <Button
                  type="submit"
                  color="primary"
                  disabled={isProfilePending}
                >
                  {isProfilePending
                    ? translate("profile.action.saving")
                    : translate("profile.action.primary")}
                  {isProfilePending ? (
                    <LoaderIcon className="size-4 animate-spin" />
                  ) : (
                    <ArrowRightIcon className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </InferredForm>
        </div>
      </div>

      <div className="px-8">
        <div className="border-accent-foreground border-x p-4">
          <h3 className="font-semibold text-base text-foreground-rich">
            {translate("password.title")}
          </h3>
          <p className="mt-1 text-foreground-dimmed text-sm">
            {translate("password.description")}
          </p>
        </div>
        <div className="-mx-8 border-accent-foreground border-t px-8">
          <InferredForm
            config={password}
            onSubmit={handlePasswordSubmit}
            className="grid grid-cols-1 gap-4 border-accent-foreground border-x p-4"
          >
            <div className="col-span-1 -mx-12 border-accent-foreground border-t px-8">
              <div className="flex justify-end p-4 pb-0">
                <Button
                  type="submit"
                  color="primary"
                  disabled={isPasswordPending}
                >
                  {isPasswordPending
                    ? translate("password.action.updating")
                    : translate("password.action.primary")}
                  {isPasswordPending ? (
                    <LoaderIcon className="size-4 animate-spin" />
                  ) : (
                    <ArrowRightIcon className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </InferredForm>
        </div>
      </div>

      <div className="px-8">
        <div className="flex justify-between border-accent-foreground border-x p-4">
          <div>
            <h3 className="font-semibold text-base text-foreground-rich">
              {translate("session.title")}
            </h3>
            <p className="mt-1 text-foreground-dimmed text-sm">
              {translate("session.description")}
            </p>
          </div>
          <Button
            variant="outline"
            color="neutral"
            className="shrink-0"
            onClick={handleSignOut}
            disabled={isSignOutPending}
          >
            {isSignOutPending ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <LogOutIcon className="size-4" />
            )}
            {isSignOutPending
              ? translate("session.action.signingOut")
              : translate("session.action.primary")}
          </Button>
        </div>
      </div>

      <div className="px-8">
        <div className="border-accent-foreground border-x p-4">
          <h3 className="font-semibold text-base text-error">
            {translate("danger.title")}
          </h3>
          <p className="mt-1 text-foreground-dimmed text-sm">
            {translate("danger.description")}
          </p>
        </div>
        <div className="-mx-8 border-accent-foreground border-t px-8">
          <div className="border-accent-foreground border-x">
            <div className="-mx-8 px-8">
              <div className="p-4">
                <div className="flex items-center justify-between gap-4 rounded-lg border border-error/20 bg-error/5 p-4">
                  <p className="font-medium text-foreground text-sm">
                    {translate("danger.prompt")}
                  </p>
                  <Button color="error">
                    {translate("danger.action.primary")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
