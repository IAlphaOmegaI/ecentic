"use client";

import {
  ChevronRightIcon,
  DownloadIcon,
  FileIcon,
  PlusIcon,
  SendMessageIcon,
  SquareChartIcon,
  SunsetIcon,
  SupportIcon,
  UploadIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Spring } from "@/lib/animations";

const navItems = [
  { icon: SquareChartIcon, label: "Overview", href: "/dashboard", exact: true },
  {
    icon: FileIcon,
    label: "Products",
    href: "/dashboard/products",
    exact: false,
    badge: "10",
  },
  {
    icon: SendMessageIcon,
    label: "Competitors",
    href: "/dashboard/competitors",
    exact: false,
  },
  {
    icon: SunsetIcon,
    label: "Optimize",
    href: "/dashboard/optimize",
    exact: false,
    badge: "4",
  },
  {
    icon: UploadIcon,
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
    icon: SupportIcon,
    label: "Settings",
    href: "/dashboard/settings",
    exact: false,
  },
] as const;

export const Sidebar = () => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <motion.aside
      className="relative hidden flex-col overflow-hidden border-accent-foreground border-r bg-background-rich md:flex"
      animate={{ width: collapsed ? 64 : 240 }}
      transition={Spring.Snappy}
    >
      <motion.div
        className={cn(
          "flex items-center overflow-hidden border-accent-foreground border-b py-4",
          collapsed ? "justify-center px-4" : "px-5",
        )}
        layout
      >
        <AnimatePresence mode="wait">
          {collapsed ? (
            <motion.div
              key="icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={Spring.Snappy}
            >
              <Image
                src="/images/trademark.svg"
                alt="écentic"
                width={28}
                height={28}
                className="size-7"
              />
            </motion.div>
          ) : (
            <motion.div
              key="wordmark"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={Spring.Snappy}
            >
              <Image
                src="/images/trademark.svg"
                alt="écentic"
                width={96}
                height={28}
                className="h-auto w-24"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <nav className="relative flex flex-1 flex-col gap-0.5 p-2">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 overflow-hidden px-3 py-2 text-sm",
                active
                  ? "text-white"
                  : "text-foreground-dimmed hover:text-foreground",
                collapsed && "justify-center px-2",
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute inset-0 bg-primary"
                  transition={Spring.Snappy}
                />
              )}
              {!active && (
                <motion.div className="absolute inset-0 bg-background-dimmed opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
              )}
              <item.icon
                className={cn(
                  "relative z-10 size-4 shrink-0",
                  active
                    ? "text-white"
                    : "text-foreground-dimmed group-hover:text-foreground",
                )}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    className="relative z-10 flex flex-1 items-center gap-2 overflow-hidden whitespace-nowrap font-medium"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={Spring.Snappy}
                  >
                    <span className="flex-1">{item.label}</span>
                    {"badge" in item && item.badge && (
                      <span
                        className={cn(
                          "px-1.5 py-0.5 font-medium text-xs",
                          active
                            ? "text-white/60"
                            : "text-foreground-dimmed/50",
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 border-accent-foreground border-t p-3">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="full-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={Spring.Snappy}
            >
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 bg-primary px-3 py-2 font-medium text-sm text-white transition-colors hover:bg-primary/90"
              >
                <PlusIcon className="size-3.5" />
                Run Simulation
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="icon-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={Spring.Snappy}
            >
              <Link
                href="/dashboard"
                className="flex items-center justify-center bg-primary p-2 text-white transition-colors hover:bg-primary/90"
              >
                <PlusIcon className="size-4" />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        onClick={() => setCollapsed((previous) => !previous)}
        className="absolute top-16 -right-3 z-10 flex size-6 items-center justify-center border border-accent-foreground bg-background-rich text-foreground-dimmed hover:text-foreground"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={Spring.Bounce}
      >
        <motion.div
          animate={{ rotate: collapsed ? 0 : 180 }}
          transition={Spring.Snappy}
        >
          <ChevronRightIcon className="size-3" />
        </motion.div>
      </motion.button>
    </motion.aside>
  );
};
