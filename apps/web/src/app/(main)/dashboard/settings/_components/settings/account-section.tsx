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
import { z } from "zod";
import * as Authentication from "@/server/app/authentication";
import * as User from "@/server/app/user";

const profile = {
  name: field({
    shape: "text",
    validator: z.string().min(1, "Required"),
    label: "First Name",
    classList: { field: "col-span-1" },
  }),
  surname: field({
    shape: "text",
    validator: z.string().min(1, "Required"),
    label: "Last Name",
    classList: { field: "col-span-1" },
  }),
  email: field({
    shape: "text",
    validator: z.string().email("Invalid email"),
    label: "Email",
    classList: { field: "col-span-2" },
  }),
  role: field({
    shape: "select",
    // @ts-expect-error - role is not typed
    validator: z.literal([
      "Founder / CEO",
      "Marketing Lead",
      "E-commerce Manager",
      "Agency",
      "Developer",
      "Other",
    ]),
    label: "Role",
    classList: { field: "col-span-2" },
  }),
} satisfies GenericForm;

const password = {
  currentPassword: field({
    shape: "text",
    type: "password",
    validator: z.string().min(1, "Required"),
    label: "Current Password",
  }),
  newPassword: field({
    shape: "text",
    type: "password",
    validator: z.string().min(8, "Minimum 8 characters"),
    label: "New Password",
  }),
  confirmPassword: field({
    shape: "text",
    type: "password",
    validator: z.string().min(8, "Minimum 8 characters"),
    label: "Confirm New Password",
  }),
} satisfies GenericForm;

export const AccountSection = ({ user }: { user: User.Type }) => {
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

  return (
    <div className="divide-y divide-accent-foreground">
      <div className="px-8">
        <div className="border-accent-foreground border-x p-4">
          <h3 className="font-medium text-2xl text-foreground">Profile</h3>
          <p className="font-light text-foreground-dimmed text-lg">
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
                  variant="flat"
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
          <h3 className="font-medium text-2xl text-foreground">
            Change Password
          </h3>
          <p className="font-light text-foreground-dimmed text-lg">
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
                  variant="flat"
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
        <div className="border-accent-foreground border-x p-4">
          <h3 className="font-medium text-2xl text-error">Danger Zone</h3>
          <p className="font-light text-foreground-dimmed text-lg">
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>
        </div>
        <div className="-mx-8 border-accent-foreground border-t px-8">
          <div className="border-accent-foreground border-x">
            <div className="-mx-8 px-8">
              <div className="flex justify-end p-4">
                <Button variant="flat" color="error">
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
