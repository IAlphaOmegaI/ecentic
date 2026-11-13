import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import * as Authentication from "@/server/app/authentication";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { HubEmptyState } from "../_components/hub-empty-state";
import {
  HubShell,
  StoresSkeleton,
  UserBadgeSkeleton,
} from "../_components/hub-shell";
import { HubStoreGrid } from "../_components/hub-store-grid";

export default () => (
  <HubShell
    userBadge={
      <Suspense fallback={<UserBadgeSkeleton />}>
        <UserBadge />
      </Suspense>
    }
    stores={
      <Suspense fallback={<StoresSkeleton />}>
        <Stores />
      </Suspense>
    }
  />
);

const UserBadge = async () => {
  const user = await unwrapResult(
    Authentication.getCurrentUser(Environment.SERVER),
  );

  return (
    <Link
      href="/dashboard/settings"
      className="flex min-w-0 items-center gap-2.5 rounded-md outline-offset-4 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-primary"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary font-semibold text-background-rich text-sm">
        {user.name.charAt(0)}
      </div>
      <span className="hidden max-w-36 truncate font-medium text-foreground text-sm md:block">
        {user.name} {user.surname}
      </span>
    </Link>
  );
};

const Stores = async () => {
  await connection();
  const stores = await unwrapResult(
    Store.overviewForCurrentUser(Environment.SERVER),
  );

  if (stores.length === 0) return <HubEmptyState />;

  return <HubStoreGrid stores={stores} />;
};
