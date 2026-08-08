"use client";

import { ArrowRightIcon, LoaderIcon, LogOutIcon } from "@zenncore/icons";
import { useRouter } from "@/i18n/navigation";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  type FormEntries,
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useToastManager } from "@zenncore/web/components/toast";
import { z } from "zod";
import { LanguageSwitcher } from "@/components/language-switcher";
import * as Authentication from "@/server/app/authentication";
import * as User from "@/server/app/user";

const labelClassName = "font-medium text-sm text-foreground";

const profile = {
  name: field({
    shape: "text",
    validator: z.string().min(1, "Required"),
    label: "First Name",
    classList: { field: "col-span-1", label: labelClassName },
  }),
  surname: field({
    shape: "text",
    validator: z.string().min(1, "Required"),
    label: "Last Name",
    classList: { field: "col-span-1", label: labelClassName },
  }),
  email: field({
    shape: "text",
    validator: z.string().email("Invalid email"),
    label: "Email",
    classList: { field: "col-span-2", label: labelClassName },
  }),
  role: field({
    shape: "select",
    validator: z.literal([
      "Founder / CEO",
      "Marketing Lead",
      "E-commerce Manager",
      "Agency",
      "Developer",
      "Other",
    ]),
    label: "Role",
    classList: { field: "col-span-2", label: labelClassName },
  }),
} satisfies GenericForm;

const password = {
  currentPassword: field({
    shape: "text",
    type: "password",
    validator: z.string().min(1, "Required"),
    label: "Current Password",
    classList: { label: labelClassName },
  }),
  newPassword: field({
    shape: "text",
    type: "password",
    validator: z.string().min(8, "Minimum 8 characters"),
    label: "New Password",
    classList: { label: labelClassName },
  }),
  confirmPassword: field({
    shape: "text",
    type: "password",
    validator: z.string().min(8, "Minimum 8 characters"),
    label: "Confirm New Password",
    classList: { label: labelClassName },
  }),
} satisfies GenericForm;

export const AccountSection = ({ user }: { user: User.Type }) => {
  const router = useRouter();
  const toast = useToastManager();

  const [handleProfileSubmit, isProfilePending] = useAsyncAction(
    async (data: FormEntries<typeof profile>) => {
      const result = await User.updateProfile(data);

      if (!result.success) {
        toast.add({
          title: "Error",
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({ title: "Profile saved", type: "success" });
    },
  );

  const [handlePasswordSubmit, isPasswordPending] = useAsyncAction(
    async (data: FormEntries<typeof password>) => {
      if (data.newPassword !== data.confirmPassword) {
        toast.add({
          title: "Passwords do not match",
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
          title: "Error",
          description: result.error.message,
          type: "error",
        });
        return;
      }
      toast.add({ title: "Password updated", type: "success" });
    },
  );

  const [handleSignOut, isSignOutPending] = useAsyncAction(async () => {
    // On success the action redirects to /sign-in server-side and never returns
    // a result, so only a failure lands here.
    const result = await Authentication.signOut();

    if (result && !result.success) {
      toast.add({
        title: "Could not sign out",
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
              Language
            </h3>
            <p className="mt-1 text-foreground-dimmed text-sm">
              Choose the language for the ecentic interface.
            </p>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="px-8">
        <div className="border-accent-foreground border-x p-4">
          <h3 className="font-semibold text-base text-foreground-rich">
            Profile
          </h3>
          <p className="mt-1 text-foreground-dimmed text-sm">
            Update your profile information.
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
              role: user.role ?? "Founder / CEO",
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
                  {isProfilePending ? "Saving..." : "Save Changes"}
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
            Change Password
          </h3>
          <p className="mt-1 text-foreground-dimmed text-sm">
            Use a strong password you do not reuse on other sites.
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
                  {isPasswordPending ? "Updating..." : "Update Password"}
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
              Session
            </h3>
            <p className="mt-1 text-foreground-dimmed text-sm">
              Sign out of this device. You will need to sign in again to access
              your dashboard.
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
            {isSignOutPending ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </div>

      <div className="px-8">
        <div className="border-accent-foreground border-x p-4">
          <h3 className="font-semibold text-base text-error">Danger Zone</h3>
          <p className="mt-1 text-foreground-dimmed text-sm">
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>
        </div>
        <div className="-mx-8 border-accent-foreground border-t px-8">
          <div className="border-accent-foreground border-x">
            <div className="-mx-8 px-8">
              <div className="p-4">
                <div className="flex items-center justify-between gap-4 rounded-lg border border-error/20 bg-error/5 p-4">
                  <p className="font-medium text-foreground text-sm">
                    Delete this account and all of its data.
                  </p>
                  <Button color="error">Delete Account</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
