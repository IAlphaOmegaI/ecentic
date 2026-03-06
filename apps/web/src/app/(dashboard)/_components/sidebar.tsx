"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileIcon,
  LoaderIcon,
  PlusIcon,
  SendMessageIcon,
  SquareChartIcon,
  SunsetIcon,
  SupportIcon,
  UploadIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  {
    icon: SquareChartIcon,
    label: "Overview",
    href: "/dashboard",
    exact: true,
  },
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
    <aside
      className={cn(
        "relative hidden flex-col border-accent-foreground border-r bg-background-rich transition-all duration-200 md:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex items-center border-accent-foreground border-b py-4",
          collapsed ? "justify-center px-4" : "px-5",
        )}
      >
        {collapsed ? (
          <Image
            src="/images/trademark.svg"
            alt="écentric"
            width={28}
            height={28}
            className="size-7"
          />
        ) : (
          <Image
            src="/images/trademark.svg"
            alt="écentric"
            width={96}
            height={28}
            className="h-auto w-24"
          />
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-white"
                  : "text-foreground-dimmed hover:bg-background-dimmed hover:text-foreground",
                collapsed && "justify-center px-2",
              )}
            >
              <item.icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-white" : "text-foreground-dimmed group-hover:text-foreground",
                )}
              />
              {!collapsed && (
                <>
                  <span className="flex-1 font-medium">{item.label}</span>
                  {"badge" in item && item.badge && (
                    <span
                      className={cn(
                        "text-xs px-1.5 py-0.5 font-medium",
                        active
                          ? "bg-white/20 text-white"
                          : "bg-background-dimmed text-foreground-dimmed",
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "flex flex-col gap-2 border-accent-foreground border-t p-3",
        )}
      >
        {!collapsed && (
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <PlusIcon className="size-3.5" />
            Run Simulation
          </Link>
        )}
        {collapsed && (
          <Link
            href="/dashboard"
            className="flex items-center justify-center bg-primary p-2 text-white transition-colors hover:bg-primary/90"
          >
            <PlusIcon className="size-4" />
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={() => setCollapsed((previous) => !previous)}
        className="absolute -right-3 top-16 flex size-6 items-center justify-center border border-accent-foreground bg-background-rich text-foreground-dimmed hover:text-foreground"
      >
        {collapsed ? (
          <ChevronRightIcon className="size-3" />
        ) : (
          <ChevronLeftIcon className="size-3" />
        )}
      </button>
    </aside>
  );
};
