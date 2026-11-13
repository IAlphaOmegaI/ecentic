import { unwrapResult } from "@zenncore/utils";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import * as Authentication from "@/server/app/authentication";
import * as Subscription from "@/server/app/subscription";
import { Environment } from "@/server/utils/environment";
import {
  SubscriptionBadgeSkeleton,
  UserButtonSkeleton,
} from "./chrome-skeletons";
import { CommandPalette } from "./command-palette";
import { NotificationBell } from "./notification-bell";
import { SubscriptionBadge } from "./subscription-badge";

/**
 * The topbar renders its frame statically and streams each data-backed region
 * on its own boundary. The search box and the bell need no server data at all,
 * so they paint with the frame; only the plan badge and the account button
 * wait, and they no longer wait on each other.
 */
export const Topbar = () => (
  <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-accent-foreground border-b bg-background-rich px-4 py-2 sm:flex-nowrap sm:px-8">
    <div className="flex min-w-24 max-w-md flex-1 items-center gap-2">
      <CommandPalette />
    </div>

    <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
      <Suspense
        fallback={
          <div
            aria-hidden
            className="h-10 w-20 shrink-0 animate-pulse rounded-sm bg-foreground/10"
          />
        }
      >
        <LanguageSwitcher />
      </Suspense>
      <NotificationBell />

      <Suspense fallback={<SubscriptionBadgeSkeleton />}>
        <Plan />
      </Suspense>

      <Suspense fallback={<UserButtonSkeleton />}>
        <Account />
      </Suspense>
    </div>
  </header>
);

const Plan = async () => {
  const subscription = await unwrapResult(
    Subscription.getStoredSubscription(Environment.SERVER),
  );

  return <SubscriptionBadge subscription={subscription} />;
};

const Account = async () => {
  const user = await unwrapResult(
    Authentication.getCurrentUser(Environment.SERVER),
  );

  return (
    <button
      type="button"
      className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
    >
      <div className="flex size-8 items-center justify-center rounded-md bg-primary font-bold text-background-rich text-sm">
        {user.name.charAt(0)}
      </div>
      <span className="hidden max-w-40 truncate font-medium text-base text-foreground md:block">
        {user.name} {user.surname}
      </span>
    </button>
  );
};
