"use client";

import { BellIcon } from "@zenncore/icons";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getForCurrentUser as getProducts } from "@/server/app/product";
import { getForCurrentUser as getCompetitors } from "@/server/app/competitor";
import type * as Product from "@/server/app/product";
import type * as Competitor from "@/server/app/competitor";

const navItems = [
  { label: "Overview", href: "/dashboard" },
  { label: "Products", href: "/dashboard/products" },
  { label: "Competitors", href: "/dashboard/competitors" },
  { label: "Simulations", href: "/dashboard/simulations" },
  { label: "UCP & Structured Data", href: "/dashboard/ucp" },
  { label: "Optimize", href: "/dashboard/optimize" },
  { label: "Settings", href: "/dashboard/settings" },
];

export const Topbar = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product.Type[]>([]);
  const [competitors, setCompetitors] = useState<Competitor.Type[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);

    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);

    Promise.all([getProducts(), getCompetitors()]).then(([pr, cr]) => {
      if (pr.success) setProducts(pr.data);
      if (cr.success) setCompetitors(cr.data);
      setLoading(false);
    });
  }, [open]);

  const q = query.toLowerCase();

  const matchedProducts = products.filter(
    (p) => !q || p.title.toLowerCase().includes(q),
  );

  const matchedCompetitors = competitors.filter(
    (c) => !q || c.title.toLowerCase().includes(q),
  );

  const matchedNav = navItems.filter(
    (n) => !q || n.label.toLowerCase().includes(q),
  );

  const hasResults =
    matchedProducts.length > 0 ||
    matchedCompetitors.length > 0 ||
    matchedNav.length > 0;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-accent-foreground border-b bg-background-rich px-5">
        <div className="flex max-w-md flex-1 items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-1 items-center gap-2 border border-accent-foreground bg-background px-3 py-1.5 text-left transition-colors hover:border-primary/40"
          >
            <svg
              className="size-4 shrink-0 text-foreground-dimmed"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12ZM15 15l-3.5-3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="font-light text-foreground-dimmed text-sm">
              Search products, competitors...
            </span>
            <kbd className="ml-auto font-light text-foreground-dimmed text-xs opacity-60">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative flex size-8 items-center justify-center text-foreground-dimmed transition-colors hover:text-foreground"
            aria-label="Notifications"
          >
            <BellIcon className="size-5" />
            <span className="absolute -top-0.5 -right-0.5 flex min-w-[16px] items-center justify-center bg-primary px-1 font-medium text-white text-[10px] leading-4">
              3
            </span>
          </button>

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

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
            />

            <motion.div
              key="panel"
              className="fixed top-[28%] left-1/2 z-50 w-full max-w-xl -translate-x-1/2 border border-accent-foreground bg-background-rich shadow-2xl"
              initial={{ opacity: 0, scale: 0.97, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -4 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-accent-foreground px-4 py-3.5">
                <svg
                  className="size-4 shrink-0 text-foreground-dimmed"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12ZM15 15l-3.5-3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products, competitors, pages..."
                  className="flex-1 bg-transparent text-foreground text-sm placeholder:text-foreground-dimmed/50 focus:outline-none"
                />
                <kbd className="shrink-0 border border-accent-foreground px-1.5 py-0.5 font-light text-foreground-dimmed text-xs">
                  esc
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto py-2">
                {loading && (
                  <p className="px-4 py-6 text-center font-light text-foreground-dimmed text-sm">
                    Loading...
                  </p>
                )}

                {!loading && !hasResults && (
                  <p className="px-4 py-6 text-center font-light text-foreground-dimmed text-sm">
                    No results{query ? ` for "${query}"` : ""}
                  </p>
                )}

                {!loading && matchedProducts.length > 0 && (
                  <div>
                    <p className="px-4 pb-1 pt-2 font-medium text-foreground-dimmed text-xs uppercase tracking-widest">
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

                {!loading && matchedCompetitors.length > 0 && (
                  <div>
                    <p className="px-4 pb-1 pt-3 font-medium text-foreground-dimmed text-xs uppercase tracking-widest">
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

                {!loading && matchedNav.length > 0 && (
                  <div>
                    <p className="px-4 pb-1 pt-3 font-medium text-foreground-dimmed text-xs uppercase tracking-widest">
                      Pages
                    </p>
                    {matchedNav.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent-foreground"
                      >
                        <svg
                          className="size-3.5 shrink-0 text-foreground-dimmed"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M2 8h12M9 3l5 5-5 5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="text-foreground text-sm">
                          {item.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 border-t border-accent-foreground px-4 py-2">
                <span className="font-light text-foreground-dimmed text-xs">
                  <kbd className="font-mono">↵</kbd> to open
                </span>
                <span className="font-light text-foreground-dimmed text-xs">
                  <kbd className="font-mono">esc</kbd> to close
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
