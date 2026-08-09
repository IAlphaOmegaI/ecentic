import { unwrapResult } from "@zenncore/utils";
import { Suspense } from "react";
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
  <header className="flex h-14 shrink-0 items-center justify-between border-accent-foreground border-b bg-background-rich px-8">
    <div className="flex max-w-md flex-1 items-center gap-2">
      <CommandPalette />
    </div>

    <div className="flex items-center gap-3">
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
      <span className="hidden font-medium text-base text-foreground md:block">
        {user.name} {user.surname}
      </span>
    </button>
  );
};
