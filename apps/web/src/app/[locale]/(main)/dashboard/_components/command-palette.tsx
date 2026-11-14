"use client";

import { ArrowRightIcon, SearchIcon, ShoppingCartIcon } from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@zenncore/web/components/avatar";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@zenncore/web/components/command";
import {
  Popover,
  PopoverPopup,
  PopoverPositioner,
  PopoverTitle,
  PopoverTrigger,
} from "@zenncore/web/components/popover";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { formatPrice } from "@/lib/currency";
import { dashboardDestinations } from "@/lib/dashboard-destinations";
import * as CommandSearch from "@/server/app/command-search";

// `segment` is relative to the current store; Settings is account-wide, so it
// carries an absolute `href` instead.
const navItems = [
  ...dashboardDestinations,
  { key: "brand", segment: "/brand" },
  { key: "quality", segment: "/quality" },
  { key: "competitors", segment: "/competitors" },
  { key: "simulations", segment: "/simulations" },
  { key: "discovery", segment: "/discovery" },
  { key: "visibility", segment: "/visibility" },
  { key: "googleShopping", segment: "/google-shopping" },
  { key: "ucp", segment: "/ucp" },
  { key: "ucpPlayground", segment: "/ucp-playground" },
  { key: "ucpComparison", segment: "/ucp-comparison" },
  { key: "settings", href: "/dashboard/settings" },
] as const;

/** Catalog matches load after typing, never as part of the chrome shell. */
export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const translate = useTranslations("dashboard.commandPalette");
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger
        ref={trigger}
        aria-label={translate("trigger")}
        className="flex h-10 min-w-0 flex-1 items-center justify-start gap-2 rounded-lg border border-background-rich/10 bg-background-rich/8 px-4 text-left text-background-rich transition-colors hover:bg-background-rich/12 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 active:bg-background-rich/12 data-popup-open:bg-emphasis"
      >
        <SearchIcon
          aria-hidden
          className="size-4 shrink-0 text-background-rich/70"
        />
        <span className="min-w-0 truncate text-background-rich/70 text-sm max-sm:sr-only">
          {translate("trigger")}
        </span>
        <kbd className="ml-auto hidden shrink-0 font-medium text-background-rich/50 text-xs sm:block">
          {translate("keyboardShortcut")}
        </kbd>
      </PopoverTrigger>
      <PopoverPositioner
        anchor={trigger}
        side="bottom"
        align="start"
        sideOffset={-40}
        collisionPadding={16}
        className="z-50"
      >
        <PopoverPopup
          initialFocus={input}
          finalFocus={trigger}
          className="inset-shadow-background-rich/20 inset-shadow-sm flex max-h-(--available-height) w-(--anchor-width) min-w-72 max-w-(--available-width) flex-col rounded-lg border-background-rich/15 bg-emphasis bg-linear-to-b from-background-rich/15 via-emphasis to-emphasis p-0 text-background-rich shadow-sm transition duration-150 ease-out data-ending-style:scale-100 data-starting-style:scale-100 data-ending-style:blur-sm data-starting-style:blur-sm motion-reduce:transition-none motion-reduce:data-ending-style:opacity-100 motion-reduce:data-starting-style:opacity-100 motion-reduce:data-ending-style:blur-none motion-reduce:data-starting-style:blur-none"
        >
          <PopoverTitle className="sr-only">
            {translate("trigger")}
          </PopoverTitle>
          {open && <Results inputRef={input} onClose={() => setOpen(false)} />}
        </PopoverPopup>
      </PopoverPositioner>
    </Popover>
  );
};

type SearchResponse = {
  key: string;
  data: CommandSearch.Results | null;
};

const Results = ({
  inputRef,
  onClose,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const translate = useTranslations("dashboard.commandPalette");
  const translateNav = useTranslations("dashboard.nav");
  const workspace = useTranslations("dashboard.workspace.nav");
  const navigationLabel = (key: (typeof navItems)[number]["key"]) => {
    switch (key) {
      case "research":
      case "channels":
      case "results":
        return workspace(key);
      default:
        return translateNav(key);
    }
  };
  const store = pathname.split("/")[2] ?? "";
  const base = `/dashboard/${store}`;
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [retry, setRetry] = useState(0);
  const normalized = query.trim();
  const searchKey = `${store}:${normalized}:${retry}`;

  useEffect(() => {
    if (!store || !normalized) return;
    const requestState = { cancelled: false };
    const timeout = window.setTimeout(async () => {
      const result = await resultify(() =>
        CommandSearch.searchForCurrentUser({ store, query: normalized }),
      );
      if (requestState.cancelled) return;
      setResponse({
        key: searchKey,
        data: result.success && result.data.success ? result.data.data : null,
      });
    }, 200);
    return () => {
      requestState.cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [store, normalized, searchKey]);

  const currentResponse = response?.key === searchKey ? response : null;
  const searching = Boolean(store && normalized && !currentResponse);
  const failed = Boolean(
    normalized && currentResponse && !currentResponse.data,
  );
  const matchedProducts = normalized
    ? (currentResponse?.data?.products ?? [])
    : [];
  const matchedCompetitors = normalized
    ? (currentResponse?.data?.competitors ?? [])
    : [];
  const matchedNav = navItems.filter((item) =>
    normalized
      ? navigationLabel(item.key)
          .toLocaleLowerCase()
          .includes(normalized.toLocaleLowerCase())
      : [
          "overview",
          "products",
          "optimize",
          "research",
          "channels",
          "results",
          "settings",
        ].includes(item.key),
  );
  const hasResults =
    matchedProducts.length + matchedCompetitors.length + matchedNav.length > 0;
  const navigate = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <Command
      shouldFilter={false}
      loop
      label={translate("trigger")}
      className="min-h-0 bg-transparent p-0 text-background-rich"
    >
      <div className="relative shrink-0 border-background-rich/15 border-b">
        <CommandInput
          ref={inputRef}
          value={query}
          onValueChange={setQuery}
          maxLength={120}
          placeholder={translate("placeholder")}
          aria-label={translate("placeholder")}
          className="pr-10 text-background-rich placeholder:text-background-rich/50"
          classList={{
            root: "p-0",
            field:
              "h-10 rounded-none border-0 bg-transparent px-4 text-background-rich shadow-none outline-none focus-within:outline-none focus-within:ring-0",
            icon: "text-background-rich/70 opacity-100",
          }}
        />
        <kbd
          aria-hidden
          className="pointer-events-none absolute top-2 right-4 rounded-sm bg-background-rich/10 px-2 py-1 text-background-rich/60 text-xs"
        >
          {translate("keyboardEscape")}
        </kbd>
      </div>
      <CommandList className="max-h-96 min-h-0 flex-1 scroll-py-2 overscroll-contain p-2">
        {searching && (
          <p
            role="status"
            className="px-2 py-4 text-background-rich/60 text-sm"
          >
            {translate("states.searching")}
          </p>
        )}
        {!hasResults && !searching && !failed && (
          <p
            role="status"
            className="px-2 py-8 text-center text-background-rich/70 text-sm"
          >
            {query
              ? translate("states.emptyForQuery", { query })
              : translate("states.empty")}
          </p>
        )}
        {failed && (
          <>
            <p
              role="status"
              className="px-2 pt-4 pb-2 text-background-rich/70 text-sm"
            >
              {translate("states.unavailable")}
            </p>
            <CommandItem
              value="retry-search"
              onSelect={() => setRetry((previous) => previous + 1)}
              className="min-h-10 cursor-pointer rounded-lg px-2 py-2 text-background-rich/85 data-[selected=true]:bg-background-rich/10 data-[selected=true]:text-background-rich"
            >
              {translate("action.primary")}
            </CommandItem>
          </>
        )}
        {matchedProducts.length > 0 && (
          <CommandGroup
            heading={translate("sections.products")}
            className="p-0 text-background-rich **:[[cmdk-group-heading]]:pt-2 **:[[cmdk-group-heading]]:pb-2 **:[[cmdk-group-heading]]:text-background-rich/50"
          >
            {matchedProducts.map((product) => (
              <CommandItem
                key={product.id}
                value={`product-${product.id}`}
                onSelect={() => navigate(`${base}/products/${product.id}`)}
                className="min-h-12 cursor-pointer gap-2 rounded-lg px-2 py-2 text-background-rich/85 data-[selected=true]:bg-background-rich/10 data-[selected=true]:text-background-rich data-[selected=true]:*:[svg]:text-background-rich"
              >
                <SearchMark image={product.image ?? undefined} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {product.title}
                </span>
                <CommandShortcut className="shrink-0 text-background-rich/55 tracking-normal group-data-[selected=true]/command-item:text-background-rich/80">
                  {product.price && product.currency ? (
                    formatPrice(product.price, product.currency)
                  ) : (
                    <ArrowRightIcon className="size-4" />
                  )}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {matchedCompetitors.length > 0 && (
          <CommandGroup
            heading={translate("sections.competitors")}
            className="mt-2 border-background-rich/10 border-t p-0 pt-2 text-background-rich **:[[cmdk-group-heading]]:pb-2 **:[[cmdk-group-heading]]:text-background-rich/50"
          >
            {matchedCompetitors.map((competitor) => (
              <CommandItem
                key={competitor.id}
                value={`competitor-${competitor.id}`}
                onSelect={() => navigate(`${base}/competitors`)}
                className="min-h-12 cursor-pointer gap-2 rounded-lg px-2 py-2 text-background-rich/85 data-[selected=true]:bg-background-rich/10 data-[selected=true]:text-background-rich data-[selected=true]:*:[svg]:text-background-rich"
              >
                <SearchMark image={competitor.image ?? undefined} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {competitor.title}
                </span>
                <CommandShortcut className="shrink-0 text-background-rich/55 tracking-normal group-data-[selected=true]/command-item:text-background-rich/80">
                  {competitor.price && competitor.currency ? (
                    formatPrice(competitor.price, competitor.currency)
                  ) : (
                    <ArrowRightIcon className="size-4" />
                  )}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {matchedNav.length > 0 && (
          <CommandGroup
            heading={translate("sections.pages")}
            className="mt-2 border-background-rich/10 border-t p-0 pt-2 text-background-rich **:[[cmdk-group-heading]]:pb-2 **:[[cmdk-group-heading]]:text-background-rich/50"
          >
            {matchedNav.map((item) => (
              <CommandItem
                key={item.key}
                value={`page-${item.key}`}
                onSelect={() =>
                  navigate(
                    "href" in item ? item.href : `${base}${item.segment}`,
                  )
                }
                className="min-h-10 cursor-pointer rounded-lg px-2 py-2 text-background-rich/85 data-[selected=true]:bg-background-rich/10 data-[selected=true]:text-background-rich data-[selected=true]:*:[svg]:text-background-rich"
              >
                <span className="min-w-0 flex-1 truncate">
                  {navigationLabel(item.key)}
                </span>
                <CommandShortcut className="text-background-rich/50 group-data-[selected=true]/command-item:text-background-rich">
                  <ArrowRightIcon className="size-4" />
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
      <div className="flex shrink-0 items-center gap-4 border-background-rich/15 border-t px-4 py-2 text-background-rich/50 text-xs">
        <span>
          <kbd>↵</kbd> {translate("hints.open")}
        </span>
        <span>
          <kbd>{translate("keyboardEscape")}</kbd> {translate("hints.close")}
        </span>
      </div>
    </Command>
  );
};

const SearchMark = ({ image }: { image?: string }) => (
  <Avatar className="size-8 shrink-0 rounded-lg border border-background-rich/15 bg-background-rich/8">
    <AvatarImage src={image} alt="" className="object-contain" />
    <AvatarFallback>
      <ShoppingCartIcon
        aria-hidden
        className="size-4 text-background-rich/60"
      />
    </AvatarFallback>
  </Avatar>
);
