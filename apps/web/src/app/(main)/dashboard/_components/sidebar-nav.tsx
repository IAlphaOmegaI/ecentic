"use client";

import {
  BarChartIcon,
  ChartCircularIcon,
  CircleBoltIcon,
  CodeIcon,
  EyeIcon,
  GaugeIcon,
  GearIcon,
  RadarIcon,
  SearchIcon,
  ShoppingCartIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as Optimizations from "@/server/app/optimization";

// Per-store items — `segment` is appended to `/dashboard/${store}` at render.
const items = [
  { icon: SquareChartIcon, label: "Overview", segment: "", exact: true },
  {
    icon: ShoppingCartIcon,
    label: "Products",
    segment: "/products",
    exact: false,
  },
  {
    icon: ChartCircularIcon,
    label: "Competitors",
    segment: "/competitors",
    exact: false,
  },
  {
    icon: RadarIcon,
    label: "Simulations",
    segment: "/simulations",
    exact: false,
  },
  {
    icon: SearchIcon,
    label: "AI Discovery",
    segment: "/discovery",
    exact: false,
  },
  { icon: GaugeIcon, label: "Optimize", segment: "/optimize", exact: false },
  {
    icon: EyeIcon,
    label: "Visibility",
    segment: "/visibility",
    exact: false,
  },
  {
    icon: CodeIcon,
    label: "UCP & Data",
    segment: "/ucp",
    exact: false,
    badge: "68%",
  },
  {
    icon: CircleBoltIcon,
    label: "UCP Playground",
    segment: "/ucp-playground",
    exact: false,
  },
  {
    icon: BarChartIcon,
    label: "UCP Comparison",
    segment: "/ucp-comparison",
    exact: false,
  },
] as const;

export namespace SidebarNav {
  export type Props = {
    store: string;
    productCount: number;
    optimizations: Optimizations.Type[];
  };
}

export const SidebarNav = ({
  store,
  productCount,
  optimizations,
}: SidebarNav.Props) => {
  const pathname = usePathname();
  const base = `/dashboard/${store}`;

  const isActive = (href: string, exact: boolean) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  const badgeFor = (item: (typeof items)[number]): string | undefined => {
    switch (true) {
      case item.label === "Products":
        return `${productCount}`;
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
        const href = `${base}${item.segment}`;
        const active = isActive(href, item.exact);
        const badge = badgeFor(item);
        return (
          <Link
            key={item.label}
            href={href}
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

      <div className="mt-auto border-accent-foreground border-t">
        <Link
          href="/dashboard/settings"
          className={cn(
            "group relative flex items-center gap-2.5 overflow-hidden border-l-[3px] px-5 py-2.5 text-sm",
            pathname.startsWith("/dashboard/settings")
              ? "border-primary bg-primary/5 font-semibold text-primary"
              : "border-transparent font-normal text-foreground-dimmed hover:bg-background hover:text-foreground",
          )}
        >
          <GearIcon className="size-4 shrink-0" />
          <span className="flex-1">Settings</span>
        </Link>
      </div>
    </nav>
  );
};
