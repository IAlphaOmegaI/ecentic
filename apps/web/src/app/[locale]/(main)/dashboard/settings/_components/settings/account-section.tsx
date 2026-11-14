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

import { AccountDeletion } from "./lifecycle-controls";

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
          classList: {
            field: "col-span-1",
            label: "font-medium text-sm text-foreground",
          },
        }),
        surname: field({
          shape: "text",
          validator: z
            .string()
            .min(1, translate("profile.fields.surname.validation")),
          label: translate("profile.fields.surname.label"),
          classList: {
            field: "col-span-1",
            label: "font-medium text-sm text-foreground",
          },
        }),
        email: field({
          shape: "text",
          validator: z
            .string()
            .email(translate("profile.fields.email.validation")),
          label: translate("profile.fields.email.label"),
          classList: {
            field: "sm:col-span-2",
            label: "font-medium text-sm text-foreground",
          },
        }),
        role: field({
          shape: "select",
          validator: z.literal(
            messages.dashboard.settings.account.profile.roles,
          ),
          label: translate("profile.fields.role.label"),
          classList: {
            field: "sm:col-span-2",
            label: "font-medium text-sm text-foreground",
          },
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
          classList: { label: "font-medium text-sm text-foreground" },
        }),
        newPassword: field({
          shape: "text",
          type: "password",
          validator: z
            .string()
            .min(8, translate("password.fields.new.validation")),
          label: translate("password.fields.new.label"),
          classList: { label: "font-medium text-sm text-foreground" },
        }),
        confirmPassword: field({
          shape: "text",
          type: "password",
          validator: z
            .string()
            .min(8, translate("password.fields.confirm.validation")),
          label: translate("password.fields.confirm.label"),
          classList: { label: "font-medium text-sm text-foreground" },
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
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <div className="min-w-0">
          <h3 className="font-semibold text-base text-foreground-rich">
            {translate("language.title")}
          </h3>
          <p className="mt-1 text-foreground-dimmed text-sm">
            {translate("language.description")}
          </p>
        </div>
        <LanguageSwitcher className="min-w-28 rounded-lg bg-background-dimmed px-3 hover:bg-background-dimmed" />
      </div>

      <section className="grid lg:grid-cols-3">
        <header className="border-accent-foreground border-b px-4 py-6 sm:px-6 lg:border-r lg:border-b-0">
          <h3 className="font-semibold text-base text-foreground-rich">
            {translate("profile.title")}
          </h3>
          <p className="mt-1 text-foreground-dimmed text-sm">
            {translate("profile.description")}
          </p>
        </header>
        <InferredForm
          config={profile}
          defaultValues={{
            name: user.name,
            surname: user.surname,
            email: user.email,
            // @ts-expect-error - user.role is not typed
            role:
              user.role ?? messages.dashboard.settings.account.profile.roles[0],
          }}
          onSubmit={handleProfileSubmit}
          className="grid min-w-0 grid-cols-1 gap-4 px-4 pt-6 sm:grid-cols-2 sm:px-6 lg:col-span-2"
        >
          <div className="col-span-full -mx-4 flex justify-end border-accent-foreground border-t px-4 py-4 sm:-mx-6 sm:px-6">
            <Button type="submit" color="primary" disabled={isProfilePending}>
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
        </InferredForm>
      </section>

      <section className="grid lg:grid-cols-3">
        <header className="border-accent-foreground border-b px-4 py-6 sm:px-6 lg:border-r lg:border-b-0">
          <h3 className="font-semibold text-base text-foreground-rich">
            {translate("password.title")}
          </h3>
          <p className="mt-1 text-foreground-dimmed text-sm">
            {translate("password.description")}
          </p>
        </header>
        <InferredForm
          config={password}
          onSubmit={handlePasswordSubmit}
          className="grid min-w-0 grid-cols-1 gap-4 px-4 pt-6 sm:px-6 lg:col-span-2"
        >
          <div className="-mx-4 flex justify-end border-accent-foreground border-t px-4 py-4 sm:-mx-6 sm:px-6">
            <Button type="submit" color="primary" disabled={isPasswordPending}>
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
        </InferredForm>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <div>
          <h3 className="font-semibold text-base text-foreground-rich">
            {translate("session.title")}
          </h3>
          <p className="mt-1 text-foreground-dimmed text-sm">
            {translate("session.description")}
          </p>
        </div>
        <Button
          variant="soft"
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
      </section>

      <section>
        <header className="px-4 pt-6 sm:px-6">
          <h3 className="font-semibold text-base text-error">
            {translate("danger.title")}
          </h3>
          <p className="mt-1 text-foreground-dimmed text-sm">
            {translate("danger.description")}
          </p>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
          <p className="font-medium text-foreground text-sm">
            {translate("danger.prompt")}
          </p>
          <AccountDeletion />
        </div>
      </section>
    </div>
  );
};
