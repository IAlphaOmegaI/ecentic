import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { type ReactNode, Suspense } from "react";
import { redirect } from "@/i18n/navigation";
import * as Authentication from "@/server/app/authentication";
import { isInternalStaff } from "@/server/database/validators";
import { Environment } from "@/server/utils/environment";
import { Navigation, WorkspaceHeader } from "./_components/navigation";

export const maxDuration = 180;

export const metadata: Metadata = {
  title: "Outbound · ecentic",
  robots: { index: false, follow: false },
};

const StaffGuard = async () => {
  const account = await Authentication.getCurrentUser(Environment.SERVER);
  if (!account.success || !isInternalStaff(account.data.role))
    redirect({ href: "/sign-in", locale: await getLocale() });
  return null;
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-emphasis font-normal md:flex-row">
      <Suspense>
        <StaffGuard />
      </Suspense>
      <Navigation />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <WorkspaceHeader />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain bg-background md:rounded-tl-lg">
          {children}
        </main>
      </div>
    </div>
  );
}
