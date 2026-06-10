"use client";

import {
  BarChartIcon,
  ChartCircularIcon,
  CircleBoltIcon,
  CodeIcon,
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
  {
    icon: BarChartIcon,
    label: "UCP Comparison",
    href: "/dashboard/ucp-comparison",
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
              "group relative flex items-center gap-2.5 overflow-hidden border-l-[3px] px-5 py-2.5 text-sm",
              active
                ? "border-primary bg-primary/5 font-semibold text-primary"
                : "border-transparent font-normal text-foreground-dimmed hover:bg-background hover:text-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="flex flex-1 items-center gap-2 overflow-hidden whitespace-nowrap">
              <span className="flex-1">{item.label}</span>
              {badge && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px font-semibold text-[11px] tabular-nums",
                    (() => {
                      const percentage = Number.parseFloat(badge);
                      switch (true) {
                        case Number.isNaN(percentage) || !badge.includes("%"):
                          return "bg-primary/10 text-primary";
                        case percentage >= 80:
                          return "bg-success/10 text-success";
                        case percentage >= 50:
                          return "bg-warning/10 text-warning";
                        default:
                          return "bg-error/10 text-error";
                      }
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
