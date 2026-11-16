"use client";

import { ArrowRightIcon, SearchIcon, ShoppingCartIcon } from "@zenncore/icons";
import { cn, resultify } from "@zenncore/utils";
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
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CustomHairlineFigure } from "@/components/hairline/custom-figure";
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
  const [session, setSession] = useState({ open: false, generation: 0 });
  const open = session.open;
  const setOpen = useCallback(
    (value: boolean | ((open: boolean) => boolean)) => {
      setSession((previous) => {
        const next = typeof value === "function" ? value(previous.open) : value;
        if (next === previous.open) return previous;
        return {
          open: next,
          generation: previous.generation + Number(next),
        };
      });
    },
    [],
  );
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
  }, [setOpen]);

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
        <ShortcutKey className="ml-auto hidden sm:inline-flex">
          {translate("keyboardShortcut")}
        </ShortcutKey>
      </PopoverTrigger>
      <PopoverPositioner
        anchor={trigger}
        side="bottom"
        align="start"
        sideOffset={({ anchor }) => -anchor.height}
        collisionPadding={16}
        className="z-50"
      >
        <PopoverPopup
          initialFocus={input}
          finalFocus={trigger}
          className="group/search-panel inset-shadow-background-rich/20 inset-shadow-sm flex max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) flex-col rounded-lg border-background-rich/15 bg-emphasis bg-linear-to-b from-background-rich/15 via-emphasis to-emphasis p-0 text-background-rich shadow-sm transition-[clip-path] duration-200 ease-out [clip-path:inset(0_0_0_0_round_var(--radius-lg))] data-ending-style:scale-100 data-starting-style:scale-100 data-ending-style:opacity-100 data-starting-style:opacity-100 motion-reduce:transition-none data-ending-style:[clip-path:inset(0_0_calc(100%_-_var(--anchor-height))_0_round_var(--radius-lg))] data-starting-style:[clip-path:inset(0_0_calc(100%_-_var(--anchor-height))_0_round_var(--radius-lg))] motion-reduce:data-ending-style:[clip-path:inset(0_0_0_0)] motion-reduce:data-starting-style:[clip-path:inset(0_0_0_0)]"
        >
          <PopoverTitle className="sr-only">
            {translate("trigger")}
          </PopoverTitle>
          {/* The package keeps this content mounted until the panel has folded
              back into the bar. A fresh opening still starts with an empty query. */}
          <Results
            key={session.generation}
            active={open}
            inputRef={input}
            onClose={() => setOpen(false)}
          />
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
  active,
  inputRef,
  onClose,
}: {
  active: boolean;
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
    if (!active || !store || !normalized) return;
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
  }, [active, store, normalized, searchKey]);

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
          className="pr-12 text-background-rich placeholder:text-background-rich/50"
          classList={{
            root: "p-0",
            field:
              "h-[calc(var(--anchor-height)_-_2px)] rounded-none border-0 bg-transparent px-4 text-background-rich shadow-none outline-none focus-within:outline-none focus-within:ring-0",
            icon: "text-background-rich/70 opacity-100",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-4 flex items-center justify-end text-background-rich/60 text-xs"
        >
          <ShortcutKey className="absolute hidden -translate-y-1 opacity-0 transition-[opacity,translate] duration-200 ease-out group-data-ending-style/search-panel:translate-y-0 group-data-starting-style/search-panel:translate-y-0 group-data-ending-style/search-panel:opacity-100 group-data-starting-style/search-panel:opacity-100 motion-reduce:transition-none sm:inline-flex">
            {translate("keyboardShortcut")}
          </ShortcutKey>
          <ShortcutKey className="transition-[opacity,translate] duration-200 ease-out group-data-ending-style/search-panel:translate-y-1 group-data-starting-style/search-panel:translate-y-1 group-data-ending-style/search-panel:opacity-0 group-data-starting-style/search-panel:opacity-0 motion-reduce:transition-none">
            {translate("keyboardEscape")}
          </ShortcutKey>
        </span>
      </div>
      <CommandList className="max-h-96 min-h-0 flex-1 scroll-py-2 overscroll-contain p-2">
        {searching && (
          <SearchState pending title={translate("states.searching")} />
        )}
        {!hasResults && !searching && !failed && (
          <SearchState
            title={
              query
                ? translate("states.emptyForQuery", { query })
                : translate("states.empty")
            }
            description={translate("states.emptyHint")}
          />
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
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-background-rich/15 border-t px-4 py-2 text-background-rich/50 text-xs">
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          <ShortcutKey>↵</ShortcutKey> {translate("hints.open")}
        </span>
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          <ShortcutKey>{translate("keyboardEscape")}</ShortcutKey>{" "}
          {translate("hints.close")}
        </span>
      </div>
    </Command>
  );
};

const ShortcutKey = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <kbd
    className={cn(
      "inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-sm border border-background-rich/10 bg-background-rich/10 px-1.5 font-body font-medium text-background-rich/70 text-xs leading-none",
      className,
    )}
  >
    {children}
  </kbd>
);

const SearchState = ({
  pending = false,
  title,
  description,
}: {
  pending?: boolean;
  title: string;
  description?: string;
}) => (
  <div
    role="status"
    className="flex flex-col items-start gap-3 px-2 py-4 sm:flex-row sm:items-center sm:gap-4"
  >
    <div aria-hidden className="pointer-events-none w-20 shrink-0 sm:w-24">
      <CustomHairlineFigure
        name={pending ? "inspection-queue" : "target-finder"}
        label=""
        surface="dark"
        className="bg-transparent [--hairline-plate:var(--color-emphasis)]"
      />
    </div>
    <div className="min-w-0 flex-1">
      <p className="break-words font-medium text-background-rich text-sm">
        {title}
      </p>
      {description && (
        <p className="mt-1 text-background-rich/60 text-xs leading-relaxed">
          {description}
        </p>
      )}
      {pending && (
        <div
          aria-hidden
          className="mt-3 space-y-2 motion-reduce:[&_*]:animate-none"
        >
          <div className="h-1.5 w-3/4 animate-pulse rounded-full bg-background-rich/15" />
          <div className="h-1.5 w-1/2 animate-pulse rounded-full bg-background-rich/10" />
        </div>
      )}
    </div>
  </div>
);

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
