"use client";

import { ArrowRightIcon, SearchIcon } from "@zenncore/icons";
import {
  Dialog,
  DialogPopup,
  DialogTrigger,
} from "@zenncore/web/components/dialog";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { formatPrice } from "@/lib/currency";
import type * as CompetitorTypes from "@/server/app/competitor";
import * as Competitor from "@/server/app/competitor";
import type * as ProductTypes from "@/server/app/product";
import * as Product from "@/server/app/product";

// `segment` is relative to the current store; Settings is account-wide, so it
// carries an absolute `href` instead.
const navItems = [
  { key: "overview", segment: "" },
  { key: "products", segment: "/products" },
  { key: "competitors", segment: "/competitors" },
  { key: "simulations", segment: "/simulations" },
  { key: "ucpStructuredData", segment: "/ucp" },
  { key: "optimize", segment: "/optimize" },
  { key: "settings", href: "/dashboard/settings" },
] as const;

/**
 * The search box takes no props and does no work until it is opened.
 *
 * It used to receive the store's products and competitors from the server, so
 * every dashboard page paid two queries and serialized both lists into the RSC
 * payload for a dialog that is almost always closed — and the box itself could
 * not paint until those queries returned. Now the trigger is static and the
 * results load on open.
 */
export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const translate = useTranslations("dashboard.commandPalette");

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-accent-foreground bg-background px-3 text-left transition-[border-color,box-shadow] hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/15">
        <SearchIcon className="size-4 shrink-0 text-foreground-dimmed" />
        <span className="font-light text-foreground-dimmed text-sm">
          {translate("trigger")}
        </span>
        <kbd className="ml-auto rounded border border-accent-foreground bg-background-rich px-1 py-px font-medium text-[10px] text-foreground-dimmed">
          {translate("keyboardShortcut")}
        </kbd>
      </DialogTrigger>

      <DialogPopup
        className="top-[28%] w-full max-w-xl translate-y-0 border border-accent-foreground bg-background-rich p-0 shadow-2xl"
        classList={{
          backdrop:
            "bg-background/70 opacity-100 backdrop-blur-sm dark:opacity-100",
        }}
      >
        {/* Mounted only while open, which is what defers the fetch — and what
            resets the query between openings, as the old effect did. */}
        {open && <Results onClose={() => setOpen(false)} />}
      </DialogPopup>
    </Dialog>
  );
};

type Catalog = {
  products: ProductTypes.Type[];
  competitors: CompetitorTypes.Type[];
};

const Results = ({ onClose }: { onClose: () => void }) => {
  const pathname = usePathname();
  const translate = useTranslations("dashboard.commandPalette");
  const store = pathname.split("/")[2] ?? "";
  const base = `/dashboard/${store}`;

  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => ref.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!store) return;

    // Plain flag rather than an AbortController: server actions can't be
    // aborted, so all this can do is drop a late response.
    let cancelled = false;

    (async () => {
      // Sequential on purpose. Next serializes server actions, so `Promise.all`
      // buys nothing here and only obscures the ordering.
      const products = await Product.skimForCurrentUser({ store });
      const competitors = await Competitor.skimForCurrentUser({ store });

      if (cancelled) return;

      setCatalog({
        products: products.success ? products.data : [],
        competitors: competitors.success ? competitors.data : [],
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [store]);

  const normalized = query.toLowerCase();

  const matchedProducts = (catalog?.products ?? []).filter(
    (product) =>
      !normalized || product.title.toLowerCase().includes(normalized),
  );

  const matchedCompetitors = (catalog?.competitors ?? []).filter(
    (competitor) =>
      !normalized || competitor.title.toLowerCase().includes(normalized),
  );

  const matchedNav = navItems.filter((item) => {
    const label = translate(`nav.${item.key}`);
    return !normalized || label.toLowerCase().includes(normalized);
  });

  const hasResults =
    matchedProducts.length > 0 ||
    matchedCompetitors.length > 0 ||
    matchedNav.length > 0;

  // Until the catalog lands, an unmatched query means "not loaded yet", not
  // "nothing there" — saying "No results" then would be a lie the user watches
  // correct itself a moment later.
  const loading = catalog === null;

  return (
    <>
      <div className="flex items-center gap-3 border-accent-foreground border-b px-4 py-3.5">
        <SearchIcon className="size-4 shrink-0 text-foreground-dimmed" />
        <input
          ref={ref}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={translate("placeholder")}
          className="flex-1 bg-transparent text-foreground text-sm placeholder:text-foreground-dimmed/50 focus:outline-none"
        />
        <kbd className="shrink-0 border border-accent-foreground px-1.5 py-0.5 font-light text-foreground-dimmed text-xs">
          {translate("keyboardEscape")}
        </kbd>
      </div>

      <div className="max-h-80 overflow-y-auto py-2">
        {!hasResults && loading && (
          <p className="px-4 py-6 text-center font-light text-foreground-dimmed text-sm">
            {translate("states.searching")}
          </p>
        )}

        {!hasResults && !loading && (
          <p className="px-4 py-6 text-center font-light text-foreground-dimmed text-sm">
            {query
              ? translate("states.emptyForQuery", { query })
              : translate("states.empty")}
          </p>
        )}

        {matchedProducts.length > 0 && (
          <div>
            <p className="px-4 pt-2 pb-1 font-medium text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
              {translate("sections.products")}
            </p>
            {matchedProducts.slice(0, 5).map((product) => (
              <Link
                key={product.id}
                href={`${base}/products/${product.id}`}
                onClick={onClose}
                className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-accent-foreground"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-6 shrink-0 items-center justify-center bg-primary/10 font-semibold text-primary text-xs">
                    {product.title.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-foreground text-sm">
                    {product.title}
                  </span>
                </div>
                {product.price && (
                  <span className="font-light text-foreground-dimmed text-xs">
                    {formatPrice(product.price, product.currency)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}

        {matchedCompetitors.length > 0 && (
          <div>
            <p className="px-4 pt-3 pb-1 font-medium text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
              {translate("sections.competitors")}
            </p>
            {matchedCompetitors.slice(0, 4).map((competitor) => (
              <Link
                key={competitor.id}
                href={`${base}/competitors`}
                onClick={onClose}
                className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-accent-foreground"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-6 shrink-0 items-center justify-center bg-accent-foreground font-semibold text-foreground-dimmed text-xs">
                    {competitor.title.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-foreground text-sm">
                    {competitor.title}
                  </span>
                </div>
                {competitor.price && (
                  <span className="font-light text-foreground-dimmed text-xs">
                    {formatPrice(competitor.price, competitor.currency)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}

        {matchedNav.length > 0 && (
          <div>
            <p className="px-4 pt-3 pb-1 font-medium text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
              {translate("sections.pages")}
            </p>
            {matchedNav.map((item) => {
              const href =
                "href" in item ? item.href : `${base}${item.segment}`;
              const label = translate(`nav.${item.key}`);
              return (
                <Link
                  key={item.key}
                  href={href}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent-foreground"
                >
                  <ArrowRightIcon className="size-4 shrink-0 text-foreground-dimmed" />
                  <span className="text-foreground text-sm">{label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 border-accent-foreground border-t px-4 py-2">
        <span className="font-light text-foreground-dimmed text-xs">
          <kbd className="font-mono">↵</kbd> {translate("hints.open")}
        </span>
        <span className="font-light text-foreground-dimmed text-xs">
          <kbd className="font-mono">{translate("keyboardEscape")}</kbd>{" "}
          {translate("hints.close")}
        </span>
      </div>
    </>
  );
};
