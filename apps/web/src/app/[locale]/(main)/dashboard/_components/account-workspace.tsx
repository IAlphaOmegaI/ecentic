import Image from "next/image";
import { useTranslations } from "next-intl";
import { type PropsWithChildren, Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { AccountNavigation, MobileSidebar } from "./sidebar-nav";
import { WorkspaceTopbar } from "./topbar";

/** Account-wide pages keep navigation without pretending to select a store. */
export const AccountWorkspace = ({ children }: PropsWithChildren) => {
  const translate = useTranslations("dashboard.sidebar");
  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-emphasis">
      <aside className="hidden min-h-0 w-60 shrink-0 flex-col overflow-hidden bg-emphasis text-background-rich md:flex">
        <div className="flex h-16 shrink-0 items-center px-4">
          <Link
            href="/dashboard"
            aria-label={translate("allStores")}
            className="w-36 rounded-sm focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4"
          >
            <Image
              src="/images/marketing/trademark-on-dark.svg"
              alt="ecentic"
              width={144}
              height={36}
              className="h-auto w-full"
              loading="eager"
            />
          </Link>
        </div>
        <AccountNavigation />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <WorkspaceTopbar>
          <Suspense fallback={null}>
            <MobileSidebar>
              <AccountNavigation />
            </MobileSidebar>
          </Suspense>
        </WorkspaceTopbar>
        <div
          data-workspace-surface
          className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg bg-background after:pointer-events-none after:absolute after:inset-0 after:inset-shadow-workspace after:z-30 after:rounded-lg"
        >
          <main className="h-full min-w-0 overflow-y-auto" data-account-scroll>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
