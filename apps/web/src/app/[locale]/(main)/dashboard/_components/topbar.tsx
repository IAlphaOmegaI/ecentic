import { ChevronDownIcon, CreditCardIcon, GearIcon } from "@zenncore/icons";
import { unwrapResult } from "@zenncore/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@zenncore/web/components/dropdown-menu";
import { getLocale, getTranslations } from "next-intl/server";
import { type ReactNode, Suspense } from "react";
import { Link, redirect } from "@/i18n/navigation";
import * as Authentication from "@/server/app/authentication";
import * as Subscription from "@/server/app/subscription";
import { Environment } from "@/server/utils/environment";
import {
  SubscriptionBadgeSkeleton,
  UserButtonSkeleton,
} from "./chrome-skeletons";
import { CommandPalette } from "./command-palette";
import { AccountNotifications } from "./notification-bell";
import { MobileNavigation } from "./sidebar";
import { SubscriptionBadge } from "./subscription-badge";

/** The static workspace frame does not wait for account or subscription reads. */
export const WorkspaceTopbar = ({ children }: { children: ReactNode }) => (
  <header className="flex h-16 shrink-0 items-center justify-between gap-2 bg-emphasis px-3 font-normal text-background-rich sm:gap-6 sm:px-6">
    <div className="flex min-w-0 max-w-xl flex-1 items-center gap-2">
      {children}
    </div>
    <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
      <Suspense fallback={<UserButtonSkeleton />}>
        <Account />
      </Suspense>
    </div>
  </header>
);

export const Topbar = ({
  params,
}: {
  params: LayoutProps<"/[locale]/dashboard/[store]">["params"];
}) => (
  <WorkspaceTopbar>
    <Suspense
      fallback={
        <div
          aria-hidden
          className="size-9 shrink-0 animate-pulse rounded-lg bg-background-rich/12 motion-reduce:animate-none md:hidden"
        />
      }
    >
      <MobileNavigation params={params} />
    </Suspense>
    <CommandPalette />
  </WorkspaceTopbar>
);

const Plan = async () => {
  const subscription = await unwrapResult(
    Subscription.getStoredSubscription(Environment.SERVER),
  );

  return <SubscriptionBadge subscription={subscription} />;
};

const Account = async () => {
  const [account, translate] = await Promise.all([
    Authentication.getCurrentUser(Environment.SERVER),
    getTranslations("dashboard.nav"),
  ]);

  if (!account.success)
    return redirect({ href: "/sign-in", locale: await getLocale() });
  const user = account.data;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${translate("settings")} · ${user.name} ${user.surname ?? ""}`.trim()}
        className="group flex min-w-0 items-center gap-2 rounded-lg py-1 pr-1.5 pl-1 transition-colors hover:bg-background-rich/8 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 data-popup-open:bg-background-rich/8"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-background-rich/15 font-semibold text-background-rich text-sm">
          {user.name.charAt(0)}
        </span>
        <span className="hidden max-w-28 truncate font-semibold text-background-rich text-sm lg:block">
          {user.name} {user.surname}
        </span>
        <ChevronDownIcon
          aria-hidden
          className="size-3.5 text-background-rich/60 transition-transform group-data-popup-open:rotate-180"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-64 border border-accent-foreground bg-background-rich p-1 font-normal"
      >
        <div className="px-2 py-2.5">
          <p className="truncate font-semibold text-foreground-rich text-sm">
            {user.name} {user.surname}
          </p>
          <p className="mt-0.5 truncate text-foreground-dimmed text-xs">
            {user.email}
          </p>
          <div className="mt-3 flex min-h-7 items-center">
            <Suspense fallback={<SubscriptionBadgeSkeleton />}>
              <Plan />
            </Suspense>
          </div>
        </div>
        <DropdownMenuSeparator />
        <AccountNotifications />
        <DropdownMenuItem
          render={<Link href="/dashboard/settings" />}
          className="gap-2.5 px-2 py-2"
        >
          <GearIcon aria-hidden className="size-4" />
          {translate("settings")}
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link href="/dashboard/settings?tab=billing" />}
          className="gap-2.5 px-2 py-2"
        >
          <CreditCardIcon aria-hidden className="size-4" />
          {translate("billing")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
