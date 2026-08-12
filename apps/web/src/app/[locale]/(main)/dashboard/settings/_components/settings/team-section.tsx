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
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { z } from "zod";
import type * as User from "@/server/app/user";

export const TeamSection = ({ user }: { user: User.Type }) => {
  const translate = useTranslations("dashboard.settings.team");
  const toast = useToastManager();

  const [handleInviteSubmit] = useAsyncAction(
    async (_data: { email: string; role?: string }) => {
      toast.add({
        title: translate("toast.inviteSent.title"),
        description: translate("toast.inviteSent.description"),
        type: "success",
      });
    },
  );

  const inviteConfig = useMemo(() => {
    const inviteRoles = [
      translate("roles.editor"),
      translate("roles.viewer"),
      translate("roles.admin"),
    ] as const;
    return {
      email: field({
        shape: "text",
        validator: z.string().email(translate("fields.email.validation")),
        label: translate("fields.email.label"),
        placeholder: translate("fields.email.placeholder"),
        classList: { field: "flex-1" },
      }),
      role: field({
        shape: "select",
        validator: z.literal(inviteRoles),
        label: translate("fields.role.label"),
      }),
    } satisfies GenericForm;
  }, [translate]);

  return (
    <div className="divide-y divide-accent-foreground">
      <div>
        <div className="flex items-center justify-between border-accent-foreground border-b bg-background-dimmed px-4 py-3">
          <p className="font-medium text-base text-foreground">
            {translate("title")}
          </p>
          <Button color="primary" className="gap-1.5">
            <PlusIcon className="size-4" />
            {translate("inviteMember")}
          </Button>
        </div>
        <div className="divide-y divide-accent-foreground">
          {[
            {
              name: `${user.name} ${user.surname}`,
              email: user.email,
              role: translate("roles.owner"),
            },
            {
              name: "Marcus Johnson",
              email: "marcus@acmestore.com",
              role: translate("roles.admin"),
            },
          ].map((member) => (
            <div
              key={member.email}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center bg-primary/10 font-medium text-base text-primary-text">
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
                {member.role !== translate("roles.owner") && (
                  <button
                    type="button"
                    className="font-light text-error text-sm hover:underline"
                  >
                    {translate("remove")}
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
            {translate("inviteByEmail")}
          </p>
        </div>
        <div className="p-6">
          <InferredForm
            config={inviteConfig}
            onSubmit={handleInviteSubmit}
            className="flex items-end gap-3"
          >
            <Button type="submit" color="primary" className="shrink-0">
              {translate("sendInvite")}
            </Button>
          </InferredForm>
        </div>
      </div>
    </div>
  );
};
