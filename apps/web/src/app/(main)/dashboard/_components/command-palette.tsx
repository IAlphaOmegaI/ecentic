"use client";

import { ArrowRightIcon, SearchIcon } from "@zenncore/icons";
import {
  Dialog,
  DialogPopup,
  DialogTrigger,
} from "@zenncore/web/components/dialog";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type * as Competitor from "@/server/app/competitor";
import type * as Product from "@/server/app/product";

const navItems = [
  { label: "Overview", href: "/dashboard" },
  { label: "Products", href: "/dashboard/products" },
  { label: "Competitors", href: "/dashboard/competitors" },
  { label: "Simulations", href: "/dashboard/simulations" },
  { label: "UCP & Structured Data", href: "/dashboard/ucp" },
  { label: "Optimize", href: "/dashboard/optimize" },
  { label: "Settings", href: "/dashboard/settings" },
] as const;

export namespace CommandPalette {
  export type Props = {
    products: Product.Type[];
    competitors: Competitor.Type[];
  };
}

export const CommandPalette = ({
  products,
  competitors,
}: CommandPalette.Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTimeout(() => ref.current?.focus(), 50);
  }, [open]);

  const normalized = query.toLowerCase();

  const matchedProducts = products.filter(
    (product) =>
      !normalized || product.title.toLowerCase().includes(normalized),
  );

  const matchedCompetitors = competitors.filter(
    (competitor) =>
      !normalized || competitor.title.toLowerCase().includes(normalized),
  );

  const matchedNav = navItems.filter(
    (item) => !normalized || item.label.toLowerCase().includes(normalized),
  );

  const hasResults =
    matchedProducts.length > 0 ||
    matchedCompetitors.length > 0 ||
    matchedNav.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex h-auto flex-1 items-center gap-2 border border-accent-foreground bg-background px-3 py-1.5 text-left transition-colors hover:border-primary/40 hover:bg-background">
        <SearchIcon className="size-4 shrink-0 text-foreground-dimmed" />
        <span className="font-light text-foreground-dimmed text-sm">
          Search products, competitors...
        </span>
        <kbd className="ml-auto font-light text-foreground-dimmed text-xs opacity-60">
          ⌘K
        </kbd>
      </DialogTrigger>

      <DialogPopup
        className="top-[28%] w-full max-w-xl translate-y-0 border border-accent-foreground bg-background-rich p-0 shadow-2xl"
        classList={{
          backdrop:
            "bg-background/70 opacity-100 backdrop-blur-sm dark:opacity-100",
        }}
      >
        <div className="flex items-center gap-3 border-accent-foreground border-b px-4 py-3.5">
          <SearchIcon className="size-4 shrink-0 text-foreground-dimmed" />
          <input
            ref={ref}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products, competitors, pages..."
            className="flex-1 bg-transparent text-foreground text-sm placeholder:text-foreground-dimmed/50 focus:outline-none"
          />
          <kbd className="shrink-0 border border-accent-foreground px-1.5 py-0.5 font-light text-foreground-dimmed text-xs">
            esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {!hasResults && (
            <p className="px-4 py-6 text-center font-light text-foreground-dimmed text-sm">
              No results{query ? ` for "${query}"` : ""}
            </p>
          )}

          {matchedProducts.length > 0 && (
            <div>
              <p className="px-4 pt-2 pb-1 font-medium text-foreground-dimmed text-xs uppercase tracking-widest">
                Products
              </p>
              {matchedProducts.slice(0, 5).map((product) => (
                <Link
                  key={product.id}
                  href={`/dashboard/products/${product.id}`}
                  onClick={() => setOpen(false)}
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
                      {product.currency ?? "USD"} {product.price}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}

          {matchedCompetitors.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 font-medium text-foreground-dimmed text-xs uppercase tracking-widest">
                Competitors
              </p>
              {matchedCompetitors.slice(0, 4).map((competitor) => (
                <Link
                  key={competitor.id}
                  href="/dashboard/competitors"
                  onClick={() => setOpen(false)}
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
                      {competitor.currency ?? "USD"} {competitor.price}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}

          {matchedNav.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 font-medium text-foreground-dimmed text-xs uppercase tracking-widest">
                Pages
              </p>
              {matchedNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent-foreground"
                >
                  <ArrowRightIcon className="size-3.5 shrink-0 text-foreground-dimmed" />
                  <span className="text-foreground text-sm">{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 border-accent-foreground border-t px-4 py-2">
          <span className="font-light text-foreground-dimmed text-xs">
            <kbd className="font-mono">↵</kbd> to open
          </span>
          <span className="font-light text-foreground-dimmed text-xs">
            <kbd className="font-mono">esc</kbd> to close
          </span>
        </div>
      </DialogPopup>
    </Dialog>
  );
};
