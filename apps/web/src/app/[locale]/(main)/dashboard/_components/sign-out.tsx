"use client";

import { LoaderIcon, LogOutIcon } from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { DropdownMenuItem } from "@zenncore/web/components/dropdown-menu";
import { useToastManager } from "@zenncore/web/components/toast";
import { unstable_rethrow } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import * as Authentication from "@/server/app/authentication";

export const AccountSignOut = () => {
  const locale = useLocale();
  const translate = useTranslations("dashboard.settings.account");
  const toast = useToastManager();
  const [signOut, pending] = useAsyncAction(async () => {
    const result = await resultify(() => Authentication.signOut({ locale }));

    // Let Next handle the action's successful redirect before reporting failures.
    if (!result.success) unstable_rethrow(result.error);
    if (!result.success || (result.data && !result.data.success))
      toast.add({ title: translate("toast.signOutFailed"), type: "error" });
  });

  return (
    <DropdownMenuItem
      className="gap-2 px-2 py-2"
      closeOnClick={false}
      disabled={pending}
      aria-busy={pending}
      onClick={signOut}
    >
      {pending ? (
        <LoaderIcon
          aria-hidden
          className="size-4 animate-spin motion-reduce:animate-none"
        />
      ) : (
        <LogOutIcon aria-hidden className="size-4" />
      )}
      {translate(
        pending ? "session.action.signingOut" : "session.action.primary",
      )}
    </DropdownMenuItem>
  );
};
