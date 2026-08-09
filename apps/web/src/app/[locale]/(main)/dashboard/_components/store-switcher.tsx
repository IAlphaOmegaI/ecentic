"use client";

import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
  ShoppingCartIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@zenncore/web/components/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type * as Store from "@/server/app/store";

export namespace StoreSwitcher {
  export type Props = {
    store: string;
    current: Store.Type | null;
    stores: Store.Type[];
  };
}

export const StoreSwitcher = ({
  store,
  current,
  stores,
}: StoreSwitcher.Props) => {
  const translate = useTranslations("dashboard.stores");

  return (
  <div className="border-accent-foreground border-b p-2">
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex w-full items-center gap-2.5 border border-accent-foreground bg-background px-2.5 py-2 text-left transition-colors hover:bg-background-dimmed">
        <div className="flex size-8 shrink-0 items-center justify-center border border-accent-foreground bg-background-rich">
          <ShoppingCartIcon className="size-4 text-foreground-dimmed" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold text-foreground text-sm">
            {current?.name ?? translate("selectStore")}
          </span>
          <span className="truncate text-[11px] text-foreground-dimmed">
            {current?.domain ?? "—"}
          </span>
        </div>
        <ChevronDownIcon className="size-4 shrink-0 text-foreground-dimmed transition-transform group-data-[popup-open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-64 rounded-none border border-accent-foreground bg-background-rich p-1"
        sideOffset={6}
      >
        {stores.map((item) => {
          const isCurrent = item.id === store;

          return (
            <DropdownMenuItem
              key={item.id}
              render={<Link href={`/dashboard/${item.id}`} />}
              className={cn(
                "gap-2.5 rounded-none px-2 py-2",
                isCurrent && "bg-primary/5",
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center border border-accent-foreground bg-background">
                <ShoppingCartIcon className="size-4 text-foreground-dimmed" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium text-foreground text-sm">
                  {item.name}
                </span>
                <span className="truncate text-[11px] text-foreground-dimmed">
                  {item.domain}
                </span>
              </span>
              {isCurrent && (
                <CheckIcon className="size-4 shrink-0 text-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator className="bg-accent-foreground" />
        <DropdownMenuItem
          render={<Link href="/dashboard" />}
          className="gap-2.5 rounded-none px-2 py-2 text-foreground-dimmed"
        >
          <span className="flex size-8 shrink-0 items-center justify-center">
            <ArrowLeftIcon className="size-4" />
          </span>
          {translate("allStores")}
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link href="/onboarding/connect" />}
          className="gap-2.5 rounded-none px-2 py-2 font-medium text-primary focus:bg-primary/10"
        >
          <span className="flex size-8 shrink-0 items-center justify-center">
            <PlusIcon className="size-4" />
          </span>
          {translate("action.primary")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
  );
};
