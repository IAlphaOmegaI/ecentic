import { unwrapResult } from "@zenncore/utils";
import Link from "next/link";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import { Environment } from "@/server/utils/environment";
import { CommandPalette } from "./command-palette";
import { NotificationBell } from "./notification-bell";

export const Topbar = async () => {
  const [products, competitors] = await Promise.all([
    unwrapResult(Product.skimForCurrentUser(Environment.SERVER)),
    unwrapResult(Competitor.skimForCurrentUser(Environment.SERVER)),
  ]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-accent-foreground border-b bg-background-rich px-8">
      <div className="flex max-w-md flex-1 items-center gap-2">
        <CommandPalette products={products} competitors={competitors} />
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />

        <Link
          href="/dashboard/settings/billing"
          className="border border-primary/30 bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs transition-colors hover:bg-primary/20"
        >
          Compete
        </Link>

        <button
          type="button"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <div className="flex size-7 items-center justify-center bg-primary font-medium text-sm text-white">
            J
          </div>
          <span className="hidden font-medium text-foreground text-sm md:block">
            Jane Smith
          </span>
        </button>
      </div>
    </header>
  );
};
