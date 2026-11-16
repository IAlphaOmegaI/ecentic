"use client";

import { BellIcon } from "@zenncore/icons";
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@zenncore/web/components/dropdown-menu";
import { useTranslations } from "next-intl";

// Notifications live with the account controls. There is no notification feed
// yet, so the empty state must not suggest unread events or offer fake actions.
export const AccountNotifications = () => {
  const translate = useTranslations("dashboard.notifications");

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="gap-2.5 px-2 py-2">
        <BellIcon aria-hidden className="size-4" />
        {translate("title")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        side="left"
        sideOffset={8}
        aria-label={translate("ariaLabel")}
        className="w-64 max-w-(--available-width) p-4"
      >
        <div className="flex items-start gap-3">
          <BellIcon
            aria-hidden
            className="mt-0.5 size-5 shrink-0 text-primary"
          />
          <div className="min-w-0">
            <p className="font-medium text-foreground-rich text-sm">
              {translate("states.empty.primary")}
            </p>
            <p className="mt-1 text-foreground-dimmed text-xs leading-5">
              {translate("states.empty.secondary")}
            </p>
          </div>
        </div>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};
