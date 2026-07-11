import { ArrowLeftIcon } from "@zenncore/icons";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { type PropsWithChildren, Suspense } from "react";
import * as Authentication from "@/server/app/authentication";
import { Environment } from "@/server/utils/environment";

const UserBadge = async () => {
  // Sign-out runs as a server action on this page, so Next re-renders us in the
  // same response with the session already destroyed. Redirect rather than throw.
  const account = await Authentication.getCurrentUser(Environment.SERVER);

  if (!account.success) redirect("/sign-in");

  const user = account.data;

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-8 items-center justify-center rounded-md bg-primary font-bold text-background-rich text-sm">
        {user.name.charAt(0)}
      </div>
      <span className="hidden font-medium text-base text-foreground md:block">
        {user.name} {user.surname}
      </span>
    </div>
  );
};

// Account-level chrome. Settings is not scoped to a single store, so it gets a
// slim header with a route back to the store hub instead of the per-store
// sidebar.
export default ({ children }: PropsWithChildren) => (
  <div className="flex flex-1 flex-col overflow-hidden">
    <header className="flex h-14 shrink-0 items-center justify-between border-accent-foreground border-b bg-background-rich px-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" aria-label="ecentic">
          <Image
            src="/images/trademark.svg"
            alt="ecentic"
            width={96}
            height={28}
            loading="eager"
          />
        </Link>
        <span className="text-accent-foreground">/</span>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-foreground-dimmed text-sm transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          All stores
        </Link>
      </div>
      <Suspense fallback={<div className="size-8 bg-accent-foreground/30" />}>
        <UserBadge />
      </Suspense>
    </header>
    <main className="flex-1 overflow-y-auto">{children}</main>
  </div>
);
