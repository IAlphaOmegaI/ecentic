"use client";

import { PlusIcon } from "@zenncore/icons";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useToastManager } from "@zenncore/web/components/toast";
import { useMemo } from "react";
import { z } from "zod";
import type * as User from "@/server/app/user";

export const TeamSection = ({ user }: { user: User.Type }) => {
  const toast = useToastManager();

  const [handleInviteSubmit] = useAsyncAction(
    async (_data: { email: string; role?: string }) => {
      toast.add({
        title: "Invite sent",
        description: "Team member invite is on its way.",
        type: "success",
      });
    },
  );

  const inviteConfig = useMemo(() => {
    const inviteRoles = ["Editor", "Viewer", "Admin"] as const;
    return {
      email: field({
        shape: "text",
        validator: z.string().email("Invalid email"),
        label: "Email address",
        placeholder: "colleague@company.com",
        classList: { field: "flex-1" },
      }),
      role: field({
        shape: "select",
        validator: z.literal(inviteRoles),
        label: "Role",
      }),
    } satisfies GenericForm;
  }, []);

  return (
    <div className="divide-y divide-accent-foreground">
      <div>
        <div className="flex items-center justify-between border-accent-foreground border-b bg-background-dimmed px-4 py-3">
          <p className="font-medium text-base text-foreground">Team Members</p>
          <Button variant="flat" color="primary" className="gap-1.5">
            <PlusIcon className="size-4" />
            Invite Member
          </Button>
        </div>
        <div className="divide-y divide-accent-foreground">
          {[
            {
              name: `${user.name} ${user.surname}`,
              email: user.email,
              role: "Owner",
            },
            {
              name: "Marcus Johnson",
              email: "marcus@acmestore.com",
              role: "Admin",
            },
          ].map((member) => (
            <div
              key={member.email}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center bg-primary/10 font-medium text-base text-primary">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-base text-foreground">
                    {member.name}
                  </p>
                  <p className="font-light text-foreground-dimmed text-sm">
                    {member.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="border border-accent-foreground px-2 py-0.5 text-foreground-dimmed text-sm">
                  {member.role}
                </span>
                {member.role !== "Owner" && (
                  <button
                    type="button"
                    className="font-light text-error text-sm hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3">
          <p className="font-medium text-base text-foreground">
            Invite by Email
          </p>
        </div>
        <div className="p-6">
          <InferredForm
            config={inviteConfig}
            onSubmit={handleInviteSubmit}
            className="flex items-end gap-3"
          >
            <Button
              type="submit"
              variant="flat"
              color="primary"
              className="shrink-0"
            >
              Send Invite
            </Button>
          </InferredForm>
        </div>
      </div>
    </div>
  );
};
