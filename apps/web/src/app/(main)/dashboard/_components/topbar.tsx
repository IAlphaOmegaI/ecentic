import { unwrapResult } from "@zenncore/utils";
import * as Authentication from "@/server/app/authentication";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import * as Subscription from "@/server/app/subscription";
import { Environment } from "@/server/utils/environment";
import { CommandPalette } from "./command-palette";
import { NotificationBell } from "./notification-bell";
import { SubscriptionBadge } from "./subscription-badge";

export const Topbar = async () => {
  const [user, products, competitors, subscription] = await Promise.all([
    unwrapResult(Authentication.getCurrentUser(Environment.SERVER)),
    unwrapResult(Product.skimForCurrentUser(Environment.SERVER)),
    unwrapResult(Competitor.skimForCurrentUser(Environment.SERVER)),
    unwrapResult(Subscription.getCurrentSubscription(Environment.SERVER)),
  ]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-accent-foreground border-b bg-background-rich px-8">
      <div className="flex max-w-md flex-1 items-center gap-2">
        <CommandPalette products={products} competitors={competitors} />
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />

        {/* <Link
          href="/dashboard/settings/billing"
          className={`border border-primary/30 bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs ${subscription?.plan && "capitalize"} transition-colors hover:bg-primary/20`}
        >
          {subscription?.plan ?? "No plan"}
        </Link> */}

        <SubscriptionBadge plan={subscription?.plan ?? null} />

        <button
          type="button"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <div className="flex size-8 items-center justify-center rounded-full bg-primary font-bold text-sm text-background-rich">
            {user.name.charAt(0)}
          </div>
          <span className="hidden font-medium text-base text-foreground md:block">
            {user.name} {user.surname}
          </span>
        </button>
      </div>
    </header>
  );
};
