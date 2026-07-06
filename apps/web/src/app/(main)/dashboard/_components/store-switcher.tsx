"use client";

import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
  ShoppingCartIcon,
} from "@zenncore/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@zenncore/web/components/dropdown-menu";
import Link from "next/link";
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
}: StoreSwitcher.Props) => (
  <div className="border-accent-foreground border-b p-2">
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex w-full items-center gap-2.5 border border-accent-foreground bg-background px-2.5 py-2 text-left transition-colors hover:bg-background-dimmed">
        <div className="flex size-8 shrink-0 items-center justify-center border border-accent-foreground bg-background-rich">
          <ShoppingCartIcon className="size-4 text-foreground-dimmed" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold text-foreground text-sm">
            {current?.name ?? "Select store"}
          </span>
          <span className="truncate text-[11px] text-foreground-dimmed">
            {current?.domain ?? "—"}
          </span>
        </div>
        <ChevronDownIcon className="size-4 shrink-0 text-foreground-dimmed transition-transform group-data-[popup-open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-none border border-accent-foreground bg-background-rich p-1"
        sideOffset={6}
      >
        {stores.map((item) => (
          <DropdownMenuItem
            key={item.id}
            render={<Link href={`/dashboard/${item.id}`} />}
            className="gap-2.5 rounded-none"
          >
            <div className="flex size-7 shrink-0 items-center justify-center border border-accent-foreground bg-background">
              <ShoppingCartIcon className="size-3.5 text-foreground-dimmed" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium text-sm">{item.name}</span>
              <span className="truncate text-[11px] text-foreground-dimmed">
                {item.domain}
              </span>
            </div>
            {item.id === store && (
              <CheckIcon className="size-4 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-accent-foreground" />
        <DropdownMenuItem
          render={<Link href="/dashboard" />}
          className="gap-2.5 rounded-none text-foreground-dimmed"
        >
          <div className="flex size-7 shrink-0 items-center justify-center">
            <ArrowLeftIcon className="size-4" />
          </div>
          All stores
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link href="/onboarding/connect" />}
          className="gap-2.5 rounded-none text-primary"
        >
          <div className="flex size-7 shrink-0 items-center justify-center">
            <PlusIcon className="size-4" />
          </div>
          Connect a store
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);
