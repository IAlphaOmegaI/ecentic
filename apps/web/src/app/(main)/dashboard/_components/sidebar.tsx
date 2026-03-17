"use client";

import {
  ChartCircularIcon,
  CodeIcon,
  DownloadIcon,
  GaugeIcon,
  GearIcon,
  PlusIcon,
  ShoppingCartIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
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

export const Sidebar = () => {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="relative hidden flex-col overflow-hidden border-accent-foreground border-r bg-background-rich md:flex">
      <div
        className={cn(
          "flex h-14 items-center justify-center overflow-hidden border-accent-foreground border-b",
        )}
      >
        <Image
          src="/images/trademark.svg"
          alt="écentic"
          width={96}
          height={28}
          className="size-8"
        />
      </div>

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
              )}
            >
              <item.icon
                className={cn(
                  "relative z-10 size-8 shrink-0",
                  active
                    ? "text-white"
                    : "text-foreground-dimmed group-hover:text-foreground",
                )}
              />

              <span className="relative z-10 flex flex-1 items-center gap-2 overflow-hidden whitespace-nowrap font-medium">
                <span className="flex-1">{item.label}</span>
                {"badge" in item && item.badge && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 font-medium text-xs",
                      active ? "text-white/60" : "text-foreground-dimmed/50",
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

      <div className="flex flex-col gap-2 border-accent-foreground border-t p-3">
        <div key="full-btn">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 bg-primary px-3 py-2 font-medium text-sm text-white transition-colors hover:bg-primary/90"
          >
            <PlusIcon className="size-3.5" />
            Run Simulation
          </Link>
        </div>
      </div>
    </aside>
  );
};
