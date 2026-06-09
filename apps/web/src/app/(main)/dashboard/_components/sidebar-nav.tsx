"use client";

import {
  ChartCircularIcon,
  CircleBoltIcon,
  CodeIcon,
  DownloadIcon,
  GaugeIcon,
  GearIcon,
  RadarIcon,
  ShoppingCartIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as Optimizations from "@/server/app/optimization";
import type * as Products from "@/server/app/product";

const items = [
  {
    icon: SquareChartIcon,
    label: "Overview",
    href: "/dashboard",
    exact: true,
  },
  {
    icon: ShoppingCartIcon,
    label: "Products",
    href: "/dashboard/products",
    exact: false,
  },
  {
    icon: ChartCircularIcon,
    label: "Competitors",
    href: "/dashboard/competitors",
    exact: false,
  },
  {
    icon: RadarIcon,
    label: "Simulations",
    href: "/dashboard/simulations",
    exact: false,
  },
  {
    icon: GaugeIcon,
    label: "Optimize",
    href: "/dashboard/optimize",
    exact: false,
  },
  {
    icon: CodeIcon,
    label: "UCP & Data",
    href: "/dashboard/ucp",
    exact: false,
    badge: "68%",
  },
  {
    icon: CircleBoltIcon,
    label: "UCP Playground",
    href: "/dashboard/ucp-playground",
    exact: false,
  },
  // {
  //   icon: DownloadIcon,
  //   label: "Reports",
  //   href: "/dashboard/reports",
  //   exact: false,
  // },
  {
    icon: GearIcon,
    label: "Settings",
    href: "/dashboard/settings",
    exact: false,
  },
] as const;

export namespace SidebarNav {
  export type Props = {
    products: Products.Type[];
    optimizations: Optimizations.Type[];
  };
}

export const SidebarNav = ({ products, optimizations }: SidebarNav.Props) => {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const badgeFor = (item: (typeof items)[number]): string | undefined => {
    switch (true) {
      case item.label === "Products":
        return `${products.length}`;
      case item.label === "Optimize":
        return `${optimizations.length}`;
      case "badge" in item && item.badge !== undefined:
        return item.badge;
      default:
        return undefined;
    }
  };

  return (
    <nav className="relative flex flex-1 flex-col">
      {items.map((item) => {
        const active = isActive(item.href, item.exact);
        const badge = badgeFor(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex items-center gap-1 overflow-hidden px-5 py-2 hover:bg-accent-foreground/20",
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
              {badge && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 font-medium text-sm tabular-nums",
                    (() => {
                      const pct = Number.parseFloat(badge);
                      if (!Number.isNaN(pct) && badge.includes("%")) {
                        if (pct >= 80) return "text-success/70";
                        if (pct >= 50) return "text-warning/70";
                        return "text-error/70";
                      }
                      return "text-primary/70";
                    })(),
                  )}
                >
                  {badge}
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};
