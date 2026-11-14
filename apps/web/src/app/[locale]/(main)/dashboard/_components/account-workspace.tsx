import { ArrowLeftIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { PropsWithChildren } from "react";
import { Link } from "@/i18n/navigation";
import { WorkspaceTopbar } from "./topbar";

/** Account-wide pages share the dashboard chrome but never pretend to select a store. */
export const AccountWorkspace = ({ children }: PropsWithChildren) => {
  const translate = useTranslations("dashboard.sidebar");
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-emphasis">
      <WorkspaceTopbar>
        <Link
          href="/dashboard"
          aria-label="ecentic"
          className="mr-3 shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Image
            src="/images/marketing/trademark-on-dark.svg"
            alt="ecentic"
            width={140}
            height={35}
            className="h-auto w-28 sm:w-35"
            loading="eager"
          />
        </Link>
        <Button
          variant="ghost"
          color="neutral"
          render={<Link href="/dashboard" />}
          className="text-background-rich/75 hover:bg-background-rich/10 hover:text-background-rich"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          <span className="hidden sm:inline">{translate("allStores")}</span>
        </Button>
      </WorkspaceTopbar>
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-background md:rounded-tl-lg">
        {children}
      </main>
    </div>
  );
};
