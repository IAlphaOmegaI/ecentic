"use client";

import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@zenncore/web/components/dropdown-menu";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type * as Store from "@/server/app/store";

export namespace StoreSwitcher {
  export type Props = {
    store: string;
    current: Store.Type | null;
    stores: Store.Type[];
  };
}

const storefrontHost = (domain: string) =>
  domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

const StoreMark = ({ name }: { name: string }) => (
  <span
    aria-hidden
    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary-text text-xs"
  >
    {name.slice(0, 1).toUpperCase() || "?"}
  </span>
);

export const StoreSwitcher = ({
  store,
  current,
  stores,
}: StoreSwitcher.Props) => {
  const translate = useTranslations("dashboard.stores");
  const currentName = current?.name ?? translate("selectStore");

  return (
    <div className="shrink-0 px-3 pt-2 pb-3">
      <DropdownMenu>
        <DropdownMenuTrigger className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-background-rich/8 focus-visible:outline-2 focus-visible:outline-primary data-popup-open:bg-background-rich/8">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background-rich/12 font-semibold text-background-rich text-sm"
          >
            {currentName.slice(0, 1).toUpperCase() || "?"}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold text-background-rich text-sm">
              {currentName}
            </span>
            <span className="mt-0.5 truncate text-background-rich/60 text-xs">
              {current?.domain ? storefrontHost(current.domain) : "—"}
            </span>
          </div>
          <ChevronDownIcon className="size-4 shrink-0 text-background-rich/65 transition-transform group-data-[popup-open]:rotate-180" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-64 border border-accent-foreground bg-background-rich p-1 font-normal"
          sideOffset={6}
        >
          {stores.map((item) => {
            const isCurrent = item.id === store;

            return (
              <DropdownMenuItem
                key={item.id}
                render={<Link href={`/dashboard/${item.id}`} />}
                className={cn("gap-2.5 px-2 py-2", isCurrent && "bg-primary/5")}
              >
                <StoreMark name={item.name} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium text-foreground text-sm">
                    {item.name}
                  </span>
                  <span className="truncate text-xs text-foreground-dimmed">
                    {storefrontHost(item.domain)}
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
            className="text-foreground-dimmed"
          >
            <ArrowLeftIcon />
            {translate("allStores")}
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<Link href="/onboarding/connect" />}
            className="font-medium text-primary focus:bg-primary/10"
          >
            <PlusIcon />
            {translate("action.primary")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
