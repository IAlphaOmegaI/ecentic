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
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";

// Per-store items — `segment` is appended to `/dashboard/${store}` at render.
const items = [
  { icon: SquareChartIcon, key: "overview", segment: "", exact: true },
  {
    icon: ShoppingCartIcon,
    key: "products",
    segment: "/products",
    exact: false,
  },
  {
    icon: ChartCircularIcon,
    key: "competitors",
    segment: "/competitors",
    exact: false,
  },
  {
    icon: RadarIcon,
    key: "simulations",
    segment: "/simulations",
    exact: false,
  },
  {
    icon: SearchIcon,
    key: "discovery",
    segment: "/discovery",
    exact: false,
  },
  { icon: GaugeIcon, key: "optimize", segment: "/optimize", exact: false },
  {
    icon: EyeIcon,
    key: "visibility",
    segment: "/visibility",
    exact: false,
  },
  {
    icon: CodeIcon,
    key: "ucp",
    segment: "/ucp",
    exact: false,
    badge: "68%",
  },
  {
    icon: CircleBoltIcon,
    key: "ucpPlayground",
    segment: "/ucp-playground",
    exact: false,
  },
  {
    icon: BarChartIcon,
    key: "ucpComparison",
    segment: "/ucp-comparison",
    exact: false,
  },
] as const;

export namespace SidebarNav {
  export type Props = {
    store: string;
    /** Streamed in — see the Sidebar's per-region Suspense boundaries. */
    productBadge: ReactNode;
    optimizationBadge: ReactNode;
  };
}

export const SidebarNav = ({
  store,
  productBadge,
  optimizationBadge,
}: SidebarNav.Props) => {
  const pathname = usePathname();
  const translate = useTranslations("Dashboard");
  const base = `/dashboard/${store}`;

  const isActive = (href: string, exact: boolean) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  // Counts arrive as slots, so only the hardcoded percentage badges can be
  // read as text for tone.
  const staticBadgeFor = (item: (typeof items)[number]): string | undefined =>
    "badge" in item && item.badge !== undefined ? item.badge : undefined;

  const badgeFor = (item: (typeof items)[number]): ReactNode => {
    switch (true) {
      case item.key === "products":
        return productBadge;
      case item.key === "optimize":
        return optimizationBadge;
      default:
        return staticBadgeFor(item);
    }
  };

  return (
    <nav className="relative flex flex-1 flex-col">
      {items.map((item) => {
        const href = `${base}${item.segment}`;
        const active = isActive(href, item.exact);
        const badge = badgeFor(item);
        const label = translate(item.key);
        return (
          <Link
            key={item.key}
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
              <span className="flex-1">{label}</span>
              {badge !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px font-semibold text-[11px] tabular-nums",
                    (() => {
                      const text = staticBadgeFor(item);
                      if (text === undefined)
                        return "bg-primary/10 text-primary";

                      const percentage = Number.parseFloat(text);
                      switch (true) {
                        case Number.isNaN(percentage) || !text.includes("%"):
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
          <span className="flex-1">{translate("settings")}</span>
        </Link>
      </div>
    </nav>
  );
};
