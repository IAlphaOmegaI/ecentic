"use client";

import {
  ArrowRightIcon,
  ChartCircularIcon,
  CheckIcon,
  CodeIcon,
  DownloadIcon,
  GaugeIcon,
  GearIcon,
  ShoppingCartIcon,
  SquareChartIcon,
  XIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Spring } from "@/lib/animations";

const items = [
  { icon: SquareChartIcon, label: "Overview", href: "/dashboard", exact: true },
  {
    icon: ShoppingCartIcon,
    label: "Products",
    href: "/dashboard/products",
    exact: false,
    badge: "10",
  },
  {
    icon: ChartCircularIcon,
    label: "Competitors",
    href: "/dashboard/competitors",
    exact: false,
  },
  {
    icon: GaugeIcon,
    label: "Optimize",
    href: "/dashboard/optimize",
    exact: false,
    badge: "4",
  },
  {
    icon: CodeIcon,
    label: "UCP & Data",
    href: "/dashboard/ucp",
    exact: false,
    badge: "68%",
  },
  {
    icon: DownloadIcon,
    label: "Reports",
    href: "/dashboard/reports",
    exact: false,
  },
  {
    icon: GearIcon,
    label: "Settings",
    href: "/dashboard/settings",
    exact: false,
  },
] as const;

const proFeatures = [
  "Unlimited AI simulations",
  "All 3 model perspectives",
  "Competitor auto-detection",
  "UCP structured data export",
  "Priority support",
] as const;

// Mock: days left in trial — swap with real value from session/billing
const TRIAL_DAYS_LEFT = 7;

export const Sidebar = () => {
  const pathname = usePathname();
  const [upgrade, setUpgrade] = useState(false);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <>
      <aside className="relative hidden w-60 flex-col overflow-hidden border-accent-foreground border-r bg-background-rich md:flex">
        <div className="flex h-14 items-center justify-center overflow-hidden border-accent-foreground border-b pr-22 pl-2">
          <Image
            src="/images/trademark.svg"
            alt="écentic"
            width={96}
            height={28}
            className="w-full"
            loading="eager"
          />
        </div>

        <nav className="relative flex flex-1 flex-col">
          {items.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-1 overflow-hidden px-2 py-2 hover:bg-accent-foreground/20",
                  active
                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                    : "text-foreground-dimmed hover:text-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "relative z-10 size-6 shrink-0",
                    active
                      ? "text-primary"
                      : "text-foreground-dimmed group-hover:text-foreground",
                  )}
                />
                <span className="relative z-10 flex flex-1 items-center gap-2 overflow-hidden whitespace-nowrap font-medium">
                  <span className="flex-1">{item.label}</span>
                  {"badge" in item && item.badge && (
                    <span
                      className={cn(
                        "px-1.5 py-0.5 font-medium text-sm tabular-nums",
                        (() => {
                          const pct = Number.parseFloat(item.badge);
                          if (!Number.isNaN(pct) && item.badge.includes("%")) {
                            if (pct >= 80) return "text-success/70";
                            if (pct >= 50) return "text-warning/70";
                            return "text-error/70";
                          }
                          return "text-primary/70";
                        })(),
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Trial card */}
        <div className="border-accent-foreground border-t">
          <button
            type="button"
            onClick={() => setUpgrade(true)}
            className="group w-full px-4 py-4 text-left transition-colors hover:bg-accent-foreground/30"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <motion.span
                  className="inline-block size-1.5 rounded-full bg-warning"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                />
                <span className="font-medium text-warning text-xs uppercase tracking-widest">
                  Free Trial
                </span>
              </div>
              <span className="font-mono text-foreground-dimmed text-xs tabular-nums">
                {TRIAL_DAYS_LEFT}d left
              </span>
            </div>
            <div className="mb-2 h-1 w-full bg-accent-foreground">
              <div
                className="h-full bg-warning/60 transition-all"
                style={{
                  width: `${Math.round((TRIAL_DAYS_LEFT / 14) * 100)}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-light text-foreground-dimmed text-xs">
                Upgrade before it ends
              </span>
              <ArrowRightIcon className="size-3 text-warning transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>
        </div>
      </aside>

      {/* Upgrade modal */}
      <AnimatePresence>
        {upgrade && (
          <>
            <motion.div
              key="upgrade-backdrop"
              className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setUpgrade(false)}
            />

            <motion.div
              key="upgrade-panel"
              className="fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 border border-accent-foreground bg-background-rich shadow-2xl"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Header */}
              <div className="flex items-start justify-between border-accent-foreground border-b px-6 py-5">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <motion.span
                      className="inline-block size-1.5 rounded-full bg-warning"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    />
                    <span className="font-medium text-warning text-xs uppercase tracking-widest">
                      Trial ending in {TRIAL_DAYS_LEFT} days
                    </span>
                  </div>
                  <h2 className="font-medium text-foreground text-xl leading-tight">
                    Upgrade to Pro
                  </h2>
                  <p className="mt-1 font-light text-foreground-dimmed text-sm">
                    Keep full access to simulations, insights, and competitor
                    intelligence.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUpgrade(false)}
                  className="flex size-7 shrink-0 items-center justify-center text-foreground-dimmed transition-colors hover:text-foreground"
                >
                  <XIcon className="size-4" />
                </button>
              </div>

              {/* Trial progress */}
              <div className="border-accent-foreground border-b px-6 py-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-light text-foreground-dimmed text-xs">
                    Trial progress
                  </span>
                  <span className="font-mono text-foreground-dimmed text-xs">
                    {14 - TRIAL_DAYS_LEFT}/14 days used
                  </span>
                </div>
                <div className="h-1.5 w-full bg-accent-foreground">
                  <motion.div
                    className="h-full bg-warning"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.round(((14 - TRIAL_DAYS_LEFT) / 14) * 100)}%`,
                    }}
                    transition={{ ...Spring.Gentle, delay: 0.2 }}
                  />
                </div>
              </div>

              {/* Features */}
              <div className="border-accent-foreground border-b px-6 py-5">
                <p className="mb-3 font-medium text-foreground-dimmed text-xs uppercase tracking-widest">
                  Everything in Pro
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {proFeatures.map((feature, index) => (
                    <motion.div
                      key={feature}
                      className="flex items-center gap-2.5"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        ...Spring.Snappy,
                        delay: 0.1 + index * 0.05,
                      }}
                    >
                      <div className="flex size-4 shrink-0 items-center justify-center bg-primary/10">
                        <CheckIcon className="size-3 text-primary" />
                      </div>
                      <span className="font-light text-foreground text-sm">
                        {feature}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Pricing + CTA */}
              <div className="px-6 py-5">
                <div className="mb-4 flex items-end gap-1.5">
                  <span className="font-semibold text-4xl text-foreground leading-none">
                    $99
                  </span>
                  <span className="mb-1 font-light text-foreground-dimmed text-sm">
                    /month
                  </span>
                </div>

                <button
                  type="button"
                  className="mb-2 w-full bg-primary py-3 font-medium text-sm text-white transition-colors hover:bg-primary/90"
                  onClick={() => setUpgrade(false)}
                >
                  Upgrade Now
                </button>
                <button
                  type="button"
                  onClick={() => setUpgrade(false)}
                  className="w-full py-2 font-light text-foreground-dimmed text-xs transition-colors hover:text-foreground"
                >
                  Maybe later — {TRIAL_DAYS_LEFT} days remaining
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
